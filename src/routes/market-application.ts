import { NextFunction, Request, Response } from 'express';
import { getMarkt, getMarktondernemer } from '../makkelijkemarkt-api';
import { getAanmeldingenByOndernemer, getMededelingen } from '../pakjekraam-api';
import { httpErrorPage, internalServerErrorPage, HTTP_CREATED_SUCCESS, HTTP_FORBIDDEN_ERROR, getQueryErrors } from '../express-util';
import models from '../model/index';
import { flatten, nextWeek, LF, today } from '../util';
import { IRSVP } from '../markt.model';
import { upsert } from '../sequelize-util.js';
import { getMarktEnriched, getMarktenEnabled } from '../model/markt.functions';
import { getConflictingApplications, getConflictingSollicitaties } from '../model/rsvp.functions';

import moment from 'moment';
import { getKeycloakUser } from '../keycloak-api';
import { GrantedRequest } from 'keycloak-connect';

export interface AttendanceUpdateFormData {
    erkenningsNummer: string;
    rsvp: {
        marktId: string;
        marktDate: string;
        attending: string;
    }[];
    next: string;
}

export const attendancePage = (
    req: GrantedRequest,
    res: Response,
    erkenningsNummer: string,
    currentMarktId: string,
    query: any,
    role: string,
    csrfToken: string,
) => {
    const ondernemerPromise = getMarktondernemer(erkenningsNummer);
    const marktenPromise = ondernemerPromise.then(ondernemer => {
        const sollicitaties = ondernemer.sollicitaties.map(sollicitatie =>
            getMarkt(String(sollicitatie.markt.id))
        );
        return Promise.all(sollicitaties);
    });

    return Promise.all([
        ondernemerPromise,
        marktenPromise,
        getAanmeldingenByOndernemer(erkenningsNummer),
        getMarktEnriched(currentMarktId),
        getMededelingen()
    ])
    .then(results => {
        const [
            ondernemer,
            markten,
            aanmeldingen,
            markt,
            mededelingen
        ] = results;

        const messages = getQueryErrors(query);
        res.render('AfmeldPage', {
            messages,
            ondernemer,
            aanmeldingen,
            markten,
            markt,
            startDate: today(),
            endDate: nextWeek(),
            currentMarktId,
            query,
            role,
            mededelingen,
            csrfToken,
            user: getKeycloakUser(req)
        });
    })
    .catch(err => internalServerErrorPage(res)(err));
};

export const handleAttendanceUpdate = (
    req: Request,
    res: Response,
    next: NextFunction,
    erkenningsNummer: string
) => {
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
    .then(conflicts => conflicts.reduce(flatten, []));

    const getConflictingSollicitatiesPromise = Promise.all(responses.map(getConflictingSollicitaties))
    .then(conflicts => conflicts.reduce(flatten, []));

    Promise.all([
        getConflictingApplicationsPromise,
        getConflictingSollicitatiesPromise,
        getMarktenEnabled()
    ])
    .then(([conflictingApplication, conflictingSollicitaties, markten]) => {
        if (conflictingApplication.length > 0 || conflictingSollicitaties.length > 0 ) {
            // Hide other messages when there is a conflicting sollicitatie
            if (conflictingSollicitaties.length > 0) {
                conflictingApplication = [];
            }

            const messagesApplication = conflictingApplication
            .map(application => {
                const marktnaam = markten.find(markt => markt.id === parseInt(application.marktId)).naam;
                return `U hebt zich al aangemeld voor <strong> ${marktnaam} </strong> op ${moment(application.marktDate).format('DD-MM-YYYY')}. Inschrijven voor meerdere markten is niet mogelijk.`;
            });

            const messagesSollicitaties = conflictingSollicitaties
            .map(sollicitatie => {
                return `U bent vasteplaatshouder op ${sollicitatie.markt.naam} en u bent hier niet afgemeld. Inschrijven voor meerdere markten op dezelfde dag(en) is niet mogelijk.`;
            });

            const messages = messagesApplication.concat(messagesSollicitaties);

            res.redirect(`./?error=${messages}`);
        } else {
            const queries = responses.map(response => {
                const { marktId, marktDate } = response;

                return upsert(
                    models.rsvp,
                    { erkenningsNummer, marktId, marktDate },
                    response
                );
            });

            Promise.all(queries).then(
                () => res.status(HTTP_CREATED_SUCCESS).redirect(req.body.next),
                error => internalServerErrorPage(res)(String(error))
            );
        }
    });
};
