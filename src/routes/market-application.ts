import {
    NextFunction,
    Request,
    Response
} from 'express';
import { GrantedRequest } from 'keycloak-connect';
import moment from 'moment-timezone';
moment.locale('nl');

import {
    httpErrorPage,
    internalServerErrorPage,
    HTTP_CREATED_SUCCESS,
    HTTP_FORBIDDEN_ERROR,
    getQueryErrors
} from '../express-util';
import { upsert } from '../sequelize-util.js';
import {
    flatten,
    nextWeek,
    LF,
    today
} from '../util';

import { getKeycloakUser } from '../keycloak-api';
import {
    getMarkt,
    getMarktondernemer
} from '../makkelijkemarkt-api';
import {
    getAanmeldingenByOndernemer,
    getMededelingen
} from '../pakjekraam-api';

import models from '../model/index';
import { IRSVP } from '../markt.model';

import {
    getMarktEnriched,
    getMarktenEnabled
} from '../model/markt.functions';
import {
    getConflictingApplications,
    getConflictingSollicitaties
} from '../model/rsvp.functions';

const {
    getMarktThresholdDate
} = require('../domain-knowledge.js');

interface AttendanceFormData {
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
    next: NextFunction,
    role: string,
    erkenningsNummer: string,
    csrfToken: string
) => {
    const ondernemerPromise = getMarktondernemer(erkenningsNummer);

    const marktenPromise = ondernemerPromise
    .then(({ sollicitaties }) => {
        const markten = sollicitaties.reduce((result, sollicitatie) => {
            return !sollicitatie.doorgehaald ?
                   result.concat(getMarkt(String(sollicitatie.markt.id))) :
                   result;
        }, []);

        return Promise.all(markten);
    })
    .then(markten => {
        return markten.filter(markt => markt.kiesJeKraamActief);
    });

    return Promise.all([
        ondernemerPromise,
        marktenPromise,
        getAanmeldingenByOndernemer(erkenningsNummer),
        getMededelingen()
    ])
    .then(results => {
        const [
            ondernemer,
            markten,
            aanmeldingen,
            mededelingen
        ] = results;

        const currentWeek = moment().week();
        const nextWeek    = moment().add(1, 'weeks').week();

        const aanmeldingenPerMarkt = aanmeldingen.reduce((result, aanmelding) => {
            const marktWeek = moment(aanmelding.marktDate).week();

            if( marktWeek !== currentWeek && marktWeek !== nextWeek) {
                return result;
            }

            const marktId = aanmelding.marktId;
            result[marktId] = result[marktId] ?
                              result[marktId].concat(aanmelding) :
                              [aanmelding];

            return result;
        }, {});

        const sollicitaties = ondernemer.sollicitaties.reduce((result, sollicitatie) => {
            result[sollicitatie.markt.id] = sollicitatie;
            return result;
        }, {});

        // const messages = getQueryErrors(query);
        res.render('AanwezigheidPage', {
            aanmeldingenPerMarkt,
            csrfToken,
            markten,
            mededelingen,
            // messages,
            ondernemer,
            // query,
            role,
            sollicitaties,
            user: getKeycloakUser(req)
        });
    })
    .catch(err => internalServerErrorPage(res)(err));
};

export const handleAttendanceUpdate = (
    req: Request,
    res: Response,
    next: NextFunction,
    role: string,
    erkenningsNummer: string
) => {
    const data: AttendanceFormData = req.body;

    // Geldige marktdagen waarvoor een ondernemer zijn aanwezigheid mag wijzigen
    // vallen binnen dit bereik:
    const startDate = getMarktThresholdDate(role);
    const endDate   = moment().day(13).endOf('day').toDate();

    // Groepeer alle RSVPs op datum, zodat we voor elke dag eenvoudig kunnen
    // controleren of het aantal aanmeldingen het maximum overschrijdt.
    const rsvpsByDate: { [marktDate: string]: IRSVP[] } = data.rsvp
    .reduce((result, rsvp) => {
        const rsvpDate = new Date(`${rsvp.marktDate} 00:00:00`);
        if (rsvpDate < startDate || rsvpDate > endDate) {
            return result;
        }
        if (!result[rsvp.marktDate]) {
            result[rsvp.marktDate] = [];
        }

        result[rsvp.marktDate].push({
            ...rsvp,
            erkenningsNummer,
            attending: rsvp.attending === '1'
        });

        return result;
    }, {});

    // Controleer per dag of het maximum wordt overschreden. Zo ja, geef dan een
    // foutmelding weer.
    //
    // TODO: Foutmeldingen moeten in het huidige formulier worden weergegeven,
    //       zodat gebruikers geen data verliezen.
    getMarktondernemer(erkenningsNummer)
    .then(({ vervangers }): any => {
        const dailyMax  = vervangers.length + 1;
        const errorDays = [];

        for (const marktDate in rsvpsByDate) {
            const attending = rsvpsByDate[marktDate].filter(rsvp => rsvp.attending);
            if (attending.length > dailyMax) {
                errorDays.push(marktDate);
            }
        }

        if (errorDays.length) {
            const errorDaysString = errorDays.map(marktDate =>
                moment(marktDate).format('dd D MMM')
            );
            const message = `U heeft teveel aanmeldingen voor de volgende marktdagen: ${errorDaysString}`;
            res.send(message);
            return;
        }

        const queries = Object.keys(rsvpsByDate).reduce((result, marktDate) => {
            return result.concat(rsvpsByDate[marktDate].map(rsvp => {
                const { marktId, marktDate } = rsvp;
                return upsert(
                    models.rsvp,
                    { erkenningsNummer, marktId, marktDate },
                    rsvp
                );
            }));
        }, []);

        Promise.all(queries).then(() =>
            res.status(HTTP_CREATED_SUCCESS).redirect(req.body.next)
        );
    })
    .catch(error => {
        internalServerErrorPage(res)(String(error));
    });
};
