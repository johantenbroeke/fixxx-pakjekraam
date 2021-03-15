import { Request, Response, NextFunction } from 'express';
import { getMarkt, getOndernemer } from '../makkelijkemarkt-api';
import {
    getIndelingVoorkeur,
    getMarktBasics,
    getMededelingen,
} from '../pakjekraam-api';

const { isExp } = require('../domain-knowledge.js');

import { getQueryErrors, internalServerErrorPage, HTTP_CREATED_SUCCESS } from '../express-util';
import { upsert } from '../sequelize-util.js';
import { IPlaatsvoorkeurRow } from '../markt.model';
import { getPlaatsvoorkeurenByMarktEnOndernemer } from '../model/plaatsvoorkeur.functions';
import models from '../model/index';
import { getKeycloakUser } from '../keycloak-api';
import { GrantedRequest } from 'keycloak-connect';

export const plaatsvoorkeurenPage = (
    req: GrantedRequest,
    res: Response,
    erkenningsNummer: string,
    query: any,
    currentMarktId: string,
    role: string,
    csrfToken: string,
) => {
    const messages          = getQueryErrors(req.query);
    const ondernemerPromise = getOndernemer(erkenningsNummer);
    const marktPromise      = ondernemerPromise
    .then(ondernemer => {
        const sollicitatie = ondernemer.sollicitaties.find(sollicitatie =>
            String(sollicitatie.markt.id) === currentMarktId
        );
        if (!sollicitatie) {
            throw Error('Geen sollicitatie voor deze markt gevonden');
        }

        return getMarktBasics(currentMarktId);
    });

    Promise.all([
        ondernemerPromise,
        marktPromise,
        getPlaatsvoorkeurenByMarktEnOndernemer(currentMarktId, erkenningsNummer),
        getIndelingVoorkeur(erkenningsNummer, currentMarktId),
        getMededelingen(),
    ]).then(
        ([ondernemer, marktBasics, plaatsvoorkeuren, indelingVoorkeur, mededelingen]) => {
            const sollicitatie = ondernemer.sollicitaties.find(soll =>
                soll.markt.id === marktBasics.markt.id
            );

            // Als iemand de status experimenteel heeft mag degene zijn plaatsvoorkeuren niet wijzigen
            if (role === 'marktondernemer' && isExp(sollicitatie.status)) {
                res.status(403);
                res.send();
            }
            res.render('VoorkeurenPage', {
                ondernemer,
                markt: marktBasics.markt,
                plaatsvoorkeuren,
                marktplaatsen: marktBasics.marktplaatsen,
                indelingVoorkeur,
                query,
                messages,
                role,
                sollicitatie,
                mededeling: mededelingen.plaatsVoorkeuren,
                csrfToken,
                user: getKeycloakUser(req)
            });
        },
        err => internalServerErrorPage(res)(err),
    );
};

const voorkeurenFormDataToObject = (formData: any): IPlaatsvoorkeurRow => ({
    marktId: formData.marktId,
    erkenningsNummer: formData.erkenningsNummer,
    plaatsId: formData.plaatsId,
    priority: parseInt(formData.priority, 10),
});

export const updatePlaatsvoorkeuren = (req: Request, res: Response, next: NextFunction, marktId: string, erkenningsNummer: string) => {
    /*
     * TODO: Form data format validation
     * TODO: Business logic validation
     */

    const { redirectTo } = req.body;

    const removeExisting = () =>
        models.plaatsvoorkeur
            .destroy({
                where: {
                    erkenningsNummer,
                    marktId,
                },
            })
            .then(n => console.log(`${n} Bestaande voorkeuren verwijderd...`));

    const ignoreEmptyVoorkeur = (voorkeur: IPlaatsvoorkeurRow) => !!voorkeur.plaatsId;

    const insertFormData = () => {
        if (req.body.plaatsvoorkeuren) {
            console.log(`${req.body.plaatsvoorkeuren.length} (nieuwe) voorkeuren opslaan...`);
            console.log(req.body.plaatsvoorkeuren);
            const voorkeuren = req.body.plaatsvoorkeuren
                .map(voorkeurenFormDataToObject)
                .map(
                    (plaatsvoorkeur: IPlaatsvoorkeurRow): IPlaatsvoorkeurRow => ({
                        ...plaatsvoorkeur,
                        erkenningsNummer,
                    }),
                )
                .filter(ignoreEmptyVoorkeur);

            return models.plaatsvoorkeur.bulkCreate(voorkeuren);
        } else {
            return null;
        }

    };

    const insertAlgVoorkeurFormData = () => {
        console.log('algemene voorkeuren opslaan...');

        return upsert(
            models.voorkeur,
            {
                erkenningsNummer,
                marktDate: req.body.marktDate || null,
                marktId,
            },
            {
                anywhere: !!req.body.anywhere,
                minimum: req.body.minimum,
                maximum: req.body.maximum,
            },
        );
    };

    // TODO: Remove and insert in one transaction
    removeExisting()
        .then(insertFormData)
        .then(insertAlgVoorkeurFormData)
        .then(
            () => res.status(HTTP_CREATED_SUCCESS).redirect(redirectTo),
            error => internalServerErrorPage(res)(error),
        );
};
