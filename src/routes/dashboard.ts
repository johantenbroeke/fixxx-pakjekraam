import { Response, NextFunction } from 'express';
import { getMarktondernemer } from '../makkelijkemarkt-api';
import {
    getPlaatsvoorkeurenOndernemer,
    getAanmeldingenByOndernemer,
    getDaysClosed
} from '../pakjekraam-api';
import { internalServerErrorPage, getQueryErrors } from '../express-util';
import { tomorrow, nextWeek } from '../util';
// import { parse } from '@babel/core';
// import { promises } from 'fs';

import { KeycloakRoles } from '../permissions';

import { getMarktenZichtbaarOndernemers } from '../model/markt.functions';
import { getAfwijzingenByOndernemer } from '../model/afwijzing.functions';
import { getToewijzingenByOndernemer } from '../model/allocation.functions';
import { GrantedRequest } from 'keycloak-connect';
import { getKeycloakUser } from '../keycloak-api';

export const dashboardPage = (req: GrantedRequest, res: Response, next: NextFunction, erkenningsNummer: string) => {

    const messages = getQueryErrors(req.query);

        Promise.all([
            getMarktondernemer(erkenningsNummer),
            getMarktenZichtbaarOndernemers(),
            getPlaatsvoorkeurenOndernemer(erkenningsNummer),
            getAanmeldingenByOndernemer(erkenningsNummer),
            getToewijzingenByOndernemer(erkenningsNummer),
            getAfwijzingenByOndernemer(erkenningsNummer),
            getDaysClosed()
        ])
        .then(
            ([ ondernemer, markten, plaatsvoorkeuren, aanmeldingen, toewijzingen, afwijzingen, daysClosed ]) => {
                res.render('OndernemerDashboard', {
                    role: KeycloakRoles.MARKTONDERNEMER,
                    ondernemer,
                    aanmeldingen,
                    markten,
                    plaatsvoorkeuren,
                    messages,
                    toewijzingen,
                    afwijzingen,
                    user: getKeycloakUser(req),
                    daysClosed,
                });
            },
            internalServerErrorPage(res),
        )
        .catch(next);
};
