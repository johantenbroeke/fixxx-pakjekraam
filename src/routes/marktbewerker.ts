import { NextFunction, Request, Response } from 'express';
import { GrantedRequest } from 'keycloak-connect';

import { internalServerErrorPage } from '../express-util';

// import { getKeycloakUser } from '../keycloak-api';
import formidable from 'formidable';

import FileType from 'file-type';
import AdmZip from 'adm-zip';
import readChunk from 'read-chunk';

import {
    MarktConfig
} from '../model/marktconfig';


import {
    Roles,
} from '../authentication';
import Markt from 'allocation/markt';

interface MarktForDB {
    config: object;
    abbreviation: string;
}

export const uploadMarktenPage = (
    req: GrantedRequest,
    res: Response,
    role: String,
    errorMessage: String,
    succesMessage: String,
) => {

    Promise.all([
    ])
        .then(([
            toewijzingen,
        ]) => {
            res.render('UploadMarktenPage', {
                // user: getKeycloakUser(req),
                user: {},
                role,
                succesMessage,
                errorMessage
            });
        })
        .catch(err => internalServerErrorPage(res)(err));

};

// NPM package file-type is a package which can detect the file type of a Buffer/Uint8Array/ArrayBuffer
async function getExtensionFromBuffer(filepath, filesize) {
    const buffer = readChunk.sync(filepath, 0, filesize);
    return await FileType.fromBuffer(buffer);
}

async function getMarktenEntries(entriesInZip) {
    // Get all entries that are directories
    const directories = entriesInZip.filter(entry => entry.isDirectory);
    // Filter out the main directory that is called 'markt'
    return directories.filter(entry => entry.entryName !== 'config/' && entry.entryName !== 'config/markt/');
}

async function jsonFromZipEntry(entry) {
    return JSON.parse(entry.getData().toString('utf8'));
}

async function marktConfigFromMarktEntries(entries) {

    const config = {
        branches: null,
        geografie: null,
        locaties: null,
        markt: null,
        paginas: null,
    };

    const branchesEntry = entries.find(entry => entry.entryName.includes('branches.json'));
    const geografieEntry = entries.find(entry => entry.entryName.includes('geografie.json'));
    const locatiesEntry = entries.find(entry => entry.entryName.includes('locaties.json'));
    const marktEntry = entries.find(entry => entry.entryName.includes('markt.json'));
    const paginasEntry = entries.find(entry => entry.entryName.includes('paginas.json'));

    config.branches = await jsonFromZipEntry(branchesEntry);
    config.geografie = await jsonFromZipEntry(geografieEntry);
    config.locaties = await jsonFromZipEntry(locatiesEntry);
    config.markt = await jsonFromZipEntry(marktEntry);
    config.paginas = await jsonFromZipEntry(paginasEntry);

    return config;

}

function getMarktAbbreviationFromEntry(entry) {
    const abbreviationArray = entry.entryName.split('/');
    return abbreviationArray[abbreviationArray.length - 2];
}


async function marktToObject(marktDirectoryEntry, zip) {
    const entries = await zip.getEntries();

    const marktForDB = {
        config: null,
        abbreviation: null,
    };

    const marktEntries = entries.filter(
        // Entry moet in de marktmap zitten
        entry => entry.entryName.includes(marktDirectoryEntry.entryName) &&
        // Mag niet identiek zijn, want dan betreft het de entry van de marktmap zelf
        entry.entryName !== marktDirectoryEntry.entryName
    );
    // Create json from marktentries
    marktForDB.config = await marktConfigFromMarktEntries(marktEntries);

    // Get abberviation from path
    marktForDB.abbreviation = getMarktAbbreviationFromEntry(marktDirectoryEntry);
    return marktForDB;
}

async function marktenToDB(marktenEntries, branchesJson, zip) {

    // To do, dit maken zodat deze hele functie terug gegeven kan worden
    const marktenForDbPromises = marktenEntries.map(marktDirectory => {
        return marktToObject(marktDirectory, zip);
    });

    return Promise.all(marktenForDbPromises)
        .then(marktenObjects => {
            Promise.all(
                marktenObjects.map( (markt: MarktForDB) => {
                    console.log(markt.abbreviation);
                    return MarktConfig.store(markt.abbreviation, branchesJson, markt.config);
                })
            );
        });
}

export const uploadMarktenZip = (
    req: GrantedRequest,
    res: Response,
    next: NextFunction,
) => {

    const form = formidable.IncomingForm();

    form.parse(req, (err, fields, filesFromForm) => {

        const marktenZip = filesFromForm.marktenZip;
        let entriesInZip = [];
        let zip = null;
        let branchesJson = null;

        if (marktenZip.size === 0) {
            throw Error('Geen bestand gevonden');
        }

        if (err) {
            throw Error('Er is iets mis gegaan bij het lezen van het formulier');
        }

        getExtensionFromBuffer(marktenZip.path, marktenZip.size)
        .then(filetype => {

            if (filetype === undefined) {
                throw Error('Bestandsextensie onbekend: het lijkt er op dat je een beschadigd bestand hebt geüpload');
            }
            if (filetype.ext !== 'zip') {
                throw Error('Bestandsextensie onjuist: gebruik alleen .zip bestanden');
            }

            zip = new AdmZip(marktenZip.path);
            return zip.getEntries();
        })
        .then(entriesRead => {
            entriesInZip = entriesRead;
            return entriesInZip.find(file => file.entryName === 'config/markt/branches.json');
        })
        .then(jsonFromZipEntry)
        .then((branchesResult) => {
            branchesJson = branchesResult;
            return getMarktenEntries(entriesInZip);
        })
        .then(marktenEntries => {
            return marktenToDB(marktenEntries, branchesJson, zip);
        })
        .then(() => {
            uploadMarktenPage(
                req,
                res,
                Roles.MARKTBEWERKER,
                null,
                'Uploaden configuratie geslaagd'
            );
        })
        .catch( error => {
            console.log(error);
            uploadMarktenPage(
                req,
                res,
                Roles.MARKTBEWERKER,
                error.message,
                null
            );
        });
    });
};
