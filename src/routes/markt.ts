import { NextFunction, Response } from 'express';
import { GrantedRequest } from 'keycloak-connect';

import {
    internalServerErrorPage,
    getQueryErrors
} from '../express-util';

import {
    getKeycloakUser
} from '../keycloak-api';
import {
    getMarkt,
    getOndernemer
} from '../makkelijkemarkt-api';
import {
    getAanmeldingenByOndernemerEnMarkt,
    getDaysClosed,
    getIndelingVoorkeur,
    getMarktBasics,
    getMededelingen,
    getPlaatsvoorkeurenOndernemer,
} from '../pakjekraam-api';

import { getToewijzingenByOndernemerEnMarkt } from '../model/allocation.functions';
import { getOndernemersLangdurigAfgemeldByMarkt } from '../model/ondernemer.functions';
import { getVoorkeurByMarktEnOndernemer } from '../model/voorkeur.functions';
import { getAfwijzingenByOndernemerAndMarkt } from '../model/afwijzing.functions';

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
        getMarktBasics(marktId),
        getOndernemer(erkenningsNummer),
        getPlaatsvoorkeurenOndernemer(erkenningsNummer),
        getAanmeldingenByOndernemerEnMarkt(marktId, erkenningsNummer),
        getIndelingVoorkeur(erkenningsNummer, req.params.marktId),
        getMededelingen(),
        getToewijzingenByOndernemerEnMarkt(marktId, erkenningsNummer),
        getAfwijzingenByOndernemerAndMarkt(marktId, erkenningsNummer),
        getVoorkeurByMarktEnOndernemer(marktId, erkenningsNummer),
        getDaysClosed()
    ])
    .then(([
        marktBasics,
        ondernemer,
        plaatsvoorkeuren,
        aanmeldingen,
        plaatsvoorkeur,
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
                markt: marktBasics.markt,
                voorkeur: plaatsvoorkeur,
                branches: marktBasics.branches,
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

