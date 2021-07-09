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

export const uploadMarktenPage = (
    req: GrantedRequest,
    res: Response,
    next: NextFunction,
    role: String,
    errorMessage?: String,
    succesMessage?: String,
) => {
    MarktConfig.getNewestConfigName()
    .then(configName => {
        res.render('UploadMarktenPage', {
            // user: getKeycloakUser(req),
            user: {},
            role,
            configName,
            succesMessage,
            errorMessage
        });
    })
    .catch(next);
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
        json: null,
        abbreviation: null,
    };

    const marktEntries = entries.filter(
        // Entry moet in de marktmap zitten
        entry => entry.entryName.includes(marktDirectoryEntry.entryName) &&
        // Mag niet identiek zijn, want dan betreft het de entry van de marktmap zelf
        entry.entryName !== marktDirectoryEntry.entryName
    );
    // Create json from marktentries
    marktForDB.json = await marktConfigFromMarktEntries(marktEntries);

    // Get abberviation from path
    marktForDB.abbreviation = getMarktAbbreviationFromEntry(marktDirectoryEntry);
    console.log("abbreviation: ", marktForDB.abbreviation);
    return marktForDB;
}

async function storeMarkten(configName, marktenEntries, branchesJSON, zip) {
    const marktConfigs: any[] = marktenEntries.map(marktDirectory => {
        return marktToObject(marktDirectory, zip);
    });

    return Promise.all(marktConfigs)
    .then(marktConfigs => {
        return Promise.all(
            marktConfigs.map(marktConfig =>
                MarktConfig.store(configName, marktConfig.abbreviation, branchesJSON, marktConfig.json)
            )
        );
    });
}

export const uploadMarktenZip = (
    req: GrantedRequest,
    res: Response,
    next: NextFunction,
    role: String
) => {
    const form = formidable.IncomingForm();

    form.parse(req, (err, fields, filesFromForm) => {
        const marktenZip = filesFromForm.marktenZip;
        const configName = marktenZip.name;
        let entriesInZip = [];
        let zip          = null;
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
            return storeMarkten(configName, marktenEntries, branchesJson, zip);
        })
        .then(() => {
            uploadMarktenPage(
                req,
                res,
                next,
                role,
                null,
                'Uploaden configuratie geslaagd'
            );
        })
        .catch( error => {
            console.error(error);
            uploadMarktenPage(
                req,
                res,
                next,
                role,
                error.message,
                null
            );
        });
    });
};
