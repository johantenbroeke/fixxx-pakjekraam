import { Promise } from 'bluebird';
import { Response, NextFunction } from 'express';
import {
    getMarkten,
    getOndernemer
} from '../makkelijkemarkt-api';
import {
    getPlaatsvoorkeurenOndernemer,
    getAanmeldingenByOndernemer,
    getDaysClosed
} from '../pakjekraam-api';
import { internalServerErrorPage, getQueryErrors } from '../express-util';
import { tomorrow, nextWeek } from '../util';

import { Roles } from '../authentication';

import { getAfwijzingenByOndernemer } from '../model/afwijzing.functions';
import { getToewijzingenByOndernemer } from '../model/allocation.functions';
import { GrantedRequest } from 'keycloak-connect';
import { getKeycloakUser } from '../keycloak-api';

export const dashboardPage = (
    req: GrantedRequest,
    res: Response,
    next: NextFunction,
    erkenningsNummer: string
) => {
    const messages = getQueryErrors(req.query);

    Promise.props({
        ondernemer       : getOndernemer(erkenningsNummer),
        markten          : getMarkten(),
        plaatsvoorkeuren : getPlaatsvoorkeurenOndernemer(erkenningsNummer),
        aanmeldingen     : getAanmeldingenByOndernemer(erkenningsNummer),
        toewijzingen     : getToewijzingenByOndernemer(erkenningsNummer),
        afwijzingen      : getAfwijzingenByOndernemer(erkenningsNummer)
    })
    .then(result => {
        res.render('OndernemerDashboard', {
            ...result,
            messages,
            role: Roles.MARKTONDERNEMER,
            user: getKeycloakUser(req)
        });
    })
    .catch(internalServerErrorPage(res));
};
