import { NextFunction, Request, Response } from 'express';
import { GrantedRequest } from 'keycloak-connect';

import { internalServerErrorPage } from '../express-util';

// import { getKeycloakUser } from '../keycloak-api';
import formidable from 'formidable';

import FileType from 'file-type';
import AdmZip from 'adm-zip';
import readChunk from 'read-chunk';

import {
    Roles,
} from '../authentication';


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

// TODO make this function put it in the database
async function branchesToDB(branchesJsonFile) {
    // Turn the object into a usable JSON
    const json = JSON.parse(branchesJsonFile.getData().toString('utf8'));
    return json;
}

async function getMarktenDirectories(entriesInZip) {
    // Get all entries that are directories
    const directories = entriesInZip.filter(entry => entry.isDirectory);
    // Filter out the main directory that is called 'markt'
    return directories.filter(entry => entry.entryName !== 'config/' && entry.entryName !== 'config/markt/');
}

async function marktenToDB(marktenDirectories, zip) {

    const entries = await zip.getEntries();

    // To do, dit maken zodat deze hele functie terug gegeven kan worden
    marktenDirectories.map( directory => {

        const jsonFiles = entries.filter(entry => entry.entryName.includes(directory.entryName));

        // marktenPromises.push)

        // for (const jsonFile of jsonFiles) {
        //     console.log(jsonFile.entryName);
        // }

        return 0;

        // return saveMarktConfig('DAPP-45', { jsonFiles });

    });

    return Promise.all(marktenDirectories);

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

        if (err) {
            throw Error('Er is iets mis gegaan bij het lezen van het formulier.');
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
            return entriesInZip.find(file => file.name === 'branches.json');
        })
        .then(branchesToDB)
        .then(() => {
            return getMarktenDirectories(entriesInZip);
        })
        .then(marktenDirectories => {
            return marktenToDB(marktenDirectories, zip);
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
