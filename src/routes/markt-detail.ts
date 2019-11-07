import { NextFunction, Request, Response } from 'express';

import { getMarktondernemer } from '../makkelijkemarkt-api';
import { getMarktEnriched } from '../model/markt.functions';
import {
    getAllBranches,
    getIndelingVoorkeur,
    getToewijzingenByOndernemerEnMarkt,
    getAanmeldingenByOndernemerEnMarkt,
    getPlaatsvoorkeurenOndernemer,
    getMededelingen,
} from '../pakjekraam-api';

import { HTTP_INTERNAL_SERVER_ERROR, httpErrorPage, getQueryErrors } from '../express-util';

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
        getMarktEnriched(marktId),
        getIndelingVoorkeur(erkenningsNummer, req.params.marktId),
        getAllBranches(),
        getMededelingen(),
        getToewijzingenByOndernemerEnMarkt(marktId, erkenningsNummer)
    ])
        .then(
            ([ondernemer, plaatsvoorkeuren, aanmeldingen, markt, voorkeur, branches, mededelingen, toewijzingen]) => {
                res.render('OndernemerMarktDetailPage', {
                    ondernemer,
                    plaatsvoorkeuren,
                    aanmeldingen,
                    markt,
                    voorkeur,
                    branches,
                    marktId: req.params.marktId,
                    next: req.query.next,
                    query,
                    messages,
                    toewijzingen,
                    mededelingen,
                });
            },
            err => httpErrorPage(res, HTTP_INTERNAL_SERVER_ERROR)(err),
        )
        .catch(next);
};
