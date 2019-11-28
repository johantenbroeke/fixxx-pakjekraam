import { getMarkt } from '../model/markt.functions';
import { getOndernemersLangdurigAfgemeldByMarkt } from '../model/ondernemer.functions';
import { getVoorkeurByMarktEnOndernemer } from '../model/voorkeur.functions';

import { NextFunction, Request, Response } from 'express';

import { getMarktondernemer } from '../makkelijkemarkt-api';
import {
    getAllBranches,
    getIndelingVoorkeur,
    getToewijzingenByOndernemerEnMarkt,
    getAanmeldingenByOndernemerEnMarkt,
    getPlaatsvoorkeurenOndernemer,
    getMededelingen,
} from '../pakjekraam-api';

import { internalServerErrorPage, getQueryErrors } from '../express-util';


export const langdurigAfgemeld = (
    req: Request,
    res: Response,
    marktId: string,
) => {
    return Promise.all([
        getMarkt(marktId),
        getOndernemersLangdurigAfgemeldByMarkt(marktId)
    ])
    .then(([markt, ondernemers]) => {
        res.render('OndernemerlijstMarkt', {
            markt,
            ondernemers,
        });
    })
    .catch( e => {
        internalServerErrorPage(res);
    });
};

export const marktDetailController = (
    req: Request,
    res: Response,
    next: NextFunction,
    erkenningsNummer: string,
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
        getVoorkeurByMarktEnOndernemer(marktId, erkenningsNummer)
    ])
        .then(
            ([ondernemer, plaatsvoorkeuren, aanmeldingen, markt, plaatsvoorkeur, branches, mededelingen, toewijzingen, algemeneVoorkeur]) => {
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
                    toewijzingen,
                    mededelingen,
                    algemeneVoorkeur,
                });
            },
            internalServerErrorPage(res),
        )
        .catch(next);
};

