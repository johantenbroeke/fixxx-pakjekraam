import { getOndernemersLangdurigAfgemeldByMarkt } from '../model/ondernemer.functions';
import { getVoorkeurByMarktEnOndernemer } from '../model/voorkeur.functions';
import { getAfwijzingenByOndernemerAndMarkt } from '../model/afwijzing.functions';

import { NextFunction, Response } from 'express';
import { GrantedRequest } from 'keycloak-connect';

import {
    getMarkt,
    getMarktondernemer
} from '../makkelijkemarkt-api';
import {
    getAllBranches,
    getIndelingVoorkeur,
    getToewijzingenByOndernemerEnMarkt,
    getAanmeldingenByOndernemerEnMarkt,
    getPlaatsvoorkeurenOndernemer,
    getMededelingen,
    getDaysClosed,
} from '../pakjekraam-api';

import { getKeycloakUser } from '../keycloak-api';

import { internalServerErrorPage, getQueryErrors } from '../express-util';

export const langdurigAfgemeld = (
    req: GrantedRequest,
    res: Response,
    marktId: string,
    role: string,
) => {
    return Promise.all([
        getMarkt(marktId),
        getOndernemersLangdurigAfgemeldByMarkt(marktId)
    ])
    .then(([markt, ondernemers]) => {
        res.render('OndernemerlijstMarkt', {
            markt,
            ondernemers,
            role,
            user: getKeycloakUser(req)
        });
    })
    .catch( e => {
        internalServerErrorPage(res);
    });
};

export const marktDetail = (
    req: GrantedRequest,
    res: Response,
    next: NextFunction,
    erkenningsNummer: string,
    role: string,
): void => {

    const marktId = req.params.marktId;
    const query = req.query;
    const messages = getQueryErrors(req.query);

        Promise.all([
            getMarktondernemer(erkenningsNummer),
            getPlaatsvoorkeurenOndernemer(erkenningsNummer),
            getAanmeldingenByOndernemerEnMarkt(marktId, erkenningsNummer),
            getMarkt(marktId),
            getIndelingVoorkeur(erkenningsNummer, req.params.marktId),
            getAllBranches(),
            getMededelingen(),
            getToewijzingenByOndernemerEnMarkt(marktId, erkenningsNummer),
            getAfwijzingenByOndernemerAndMarkt(marktId, erkenningsNummer),
            getVoorkeurByMarktEnOndernemer(marktId, erkenningsNummer),
            getDaysClosed()
        ])
        .then(([
            ondernemer,
            plaatsvoorkeuren,
            aanmeldingen,
            markt,
            plaatsvoorkeur,
            branches,
            mededelingen,
            toewijzingen,
            afwijzingen,
            algemeneVoorkeur,
            daysClosed
        ]) => {
                res.render('OndernemerMarktDetailPage', {
                    ondernemer,
                    plaatsvoorkeuren,
                    aanmeldingen,
                    markt,
                    voorkeur: plaatsvoorkeur,
                    branches,
                    marktId: req.params.marktId,
                    next: req.query.next,
                    query,
                    messages,
                    mededelingen,
                    toewijzingen,
                    afwijzingen,
                    algemeneVoorkeur,
                    role,
                    daysClosed,
                    user: getKeycloakUser(req)
                });
            },
            internalServerErrorPage(res),
        )
        .catch(next);
};

