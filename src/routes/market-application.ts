import { NextFunction, Request, Response } from 'express';
import { getMarkt, getMarktondernemer } from '../makkelijkemarkt-api';
import { getAanmeldingenByOndernemer, getConflictingApplications, getMededelingen } from '../pakjekraam-api';
import { httpErrorPage, internalServerErrorPage, HTTP_CREATED_SUCCESS, HTTP_FORBIDDEN_ERROR, getQueryErrors } from '../express-util';
import models from '../model/index';
import { flatten, nextWeek, LF, tomorrow } from '../util';
import { IRSVP } from '../markt.model';
import { upsert } from '../sequelize-util.js';
import { getMarktEnriched, getMarktenEnabled } from '../model/markt.functions';

import moment from 'moment';
import { getKeycloakUser } from '../keycloak-api';
import { GrantedRequest } from 'keycloak-connect';

export const attendancePage = (
    req: GrantedRequest,
    res: Response,
    erkenningsNummer: string,
    currentMarktId: string,
    query: any,
    role: string,
    csrfToken: string,
) => {

    const messages = getQueryErrors(query);

    const ondernemerPromise = getMarktondernemer(erkenningsNummer);
    const marktenPromise = ondernemerPromise.then(ondernemer =>
        Promise.all(
            ondernemer.sollicitaties
                .map(sollicitatie => String(sollicitatie.markt.id))
                .map(marktId => getMarkt(marktId)),
        ),
    );

    return Promise.all([
        ondernemerPromise,
        marktenPromise,
        getAanmeldingenByOndernemer(erkenningsNummer),
        getMarktEnriched(currentMarktId),
        getMededelingen()
    ]).then(
        ([ondernemer, markten, aanmeldingen, markt, mededelingen]) => {
            res.render('AfmeldPage', {
                messages,
                ondernemer,
                aanmeldingen,
                markten,
                markt,
                startDate: tomorrow(),
                endDate: nextWeek(),
                currentMarktId,
                query,
                role,
                mededelingen,
                csrfToken,
                user: getKeycloakUser(req)
            });
        },
        err => internalServerErrorPage(res)(err),
    );
};

export interface AttendanceUpdateFormData {
    erkenningsNummer: string;
    rsvp: {
        marktId: string;
        marktDate: string;
        attending: string;
    }[];
    next: string;
}

export const handleAttendanceUpdate = (req: Request, res: Response, next: NextFunction, erkenningsNummer: string) => {
    const data: AttendanceUpdateFormData = req.body;
    /*
     * TODO: Form data format validation
     * TODO: Business logic validation
     */

    const responses = data.rsvp.map(
        (rsvp): IRSVP => ({
            ...rsvp,
            attending: rsvp.attending === 'true',
            erkenningsNummer,
        }),
    );

    const getConflictingApplicationsPromise = Promise.all(responses.map(getConflictingApplications))
        .then(conflicts => {
            return conflicts.reduce(flatten, []);
        });

    Promise.all([
        getConflictingApplicationsPromise,
        getMarktenEnabled()
    ])
        .then(([conflicts, markten]) => {

            if (conflicts.length > 0) {
                const messages = conflicts
                    .map(application => {
                        const marktnaam = markten.find(markt => markt.id === parseInt(application.marktId)).naam;
                        return `U hebt zich al aangemeld voor <strong> ${marktnaam} </strong> op ${moment(application.marktDate).format('DD-MM-YYYY')}. Inschrijven voor meerdere markten is niet mogelijk.`;
                    });
                res.redirect(`./?error=${messages}`);

            } else {
                // TODO: Redirect with success code
                // TODO: Use `Sequelize.transaction`
                Promise.all(
                    responses.map(response => {
                        const { marktId, marktDate } = response;

                        return upsert(
                            models.rsvp,
                            {
                                erkenningsNummer,
                                marktId,
                                marktDate,
                            },
                            response,
                        );
                    }),
                ).then(
                    () => res.status(HTTP_CREATED_SUCCESS).redirect(req.body.next),
                    error => internalServerErrorPage(res)(String(error)),
                );
            }
        });
};
