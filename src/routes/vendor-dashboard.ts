import { Request, Response, NextFunction } from 'express';
import { getMarktondernemer } from '../makkelijkemarkt-api';
import {
    getMarkten,
    getPlaatsvoorkeurenOndernemer,
    getAanmeldingenByOndernemer,
    getToewijzingenByOndernemer,
} from '../pakjekraam-api';
import { errorPage, getQueryErrors } from '../express-util';
import { tomorrow, nextWeek } from '../util';
// import { parse } from '@babel/core';
// import { promises } from 'fs';

import { getMarktEnriched } from '../model/markt.functions';

export const vendorDashboardPage = (req: Request, res: Response, next: NextFunction, erkenningsNummer: string) => {

    const messages = getQueryErrors(req.query);
    const ondernemerPromise = getMarktondernemer(erkenningsNummer);
    const ondernemerVoorkeurenPromise = getPlaatsvoorkeurenOndernemer(erkenningsNummer);

    const marktenPromise = getMarkten()
        .then(markten => {
            const marktenMetProperties = markten.map(markt => {
                return getMarktEnriched(String(markt.id)).then(props => (props));
            });
            return Promise.all(marktenMetProperties);
        });

    Promise.all([
        ondernemerPromise,
        marktenPromise,
        ondernemerVoorkeurenPromise,
        getAanmeldingenByOndernemer(erkenningsNummer),
        getToewijzingenByOndernemer(erkenningsNummer)
    ])
        .then(
            ([ ondernemer, markten, plaatsvoorkeuren, aanmeldingen, toewijzingen ]) => {
                res.render('OndernemerDashboard', {
                    ondernemer,
                    aanmeldingen,
                    markten,
                    plaatsvoorkeuren,
                    startDate: tomorrow(),
                    endDate: nextWeek(),
                    messages,
                    toewijzingen,
                });
            },
            err => errorPage(res, err),
        )
        .catch(next);
};
