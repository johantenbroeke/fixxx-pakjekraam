import { Request, Response, NextFunction } from 'express';
import { getMarktondernemer } from '../makkelijkemarkt-api';
import {
    getMarkten,
    getPlaatsvoorkeurenOndernemer,
    getAanmeldingenByOndernemer,
    getToewijzingenByOndernemer,
} from '../pakjekraam-api';
import { internalServerErrorPage, getQueryErrors } from '../express-util';
import { tomorrow, nextWeek } from '../util';
// import { parse } from '@babel/core';
// import { promises } from 'fs';

import { getMarktenZichtbaarOndernemers } from '../model/markt.functions';

export const vendorDashboardPage = (req: Request, res: Response, next: NextFunction, erkenningsNummer: string) => {

    const messages = getQueryErrors(req.query);

    Promise.all([
        getMarktondernemer(erkenningsNummer),
        getMarktenZichtbaarOndernemers(),
        getPlaatsvoorkeurenOndernemer(erkenningsNummer),
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
            internalServerErrorPage(res),
        )
        .catch(next);
};
