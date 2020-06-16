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
import {
    Roles
} from '../authentication';

import { getKeycloakUser } from '../keycloak-api';
import {
    getMarktenForOndernemer,
    getOndernemer
} from '../makkelijkemarkt-api';
import {
    getAanmeldingenByOndernemer,
    getMededelingen
} from '../pakjekraam-api';

import models from '../model/index';
import { IRSVP } from '../markt.model';

import {
    getMarktEnriched
} from '../model/markt.functions';
import {
    groupAanmeldingenPerMarktPerWeek
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

interface RSVPsGrouped {
    [marktDate: string]: IRSVP[]
}

const isEqualAanmelding = (aanmelding) => {
    return a =>
        Number(a.marktId) === Number(aanmelding.marktId) &&
        a.marktDate === aanmelding.marktDate;
};

export const attendancePage = (
    req: GrantedRequest,
    res: Response,
    next: NextFunction,
    role: string,
    erkenningsNummer: string,
    csrfToken: string,
    messages: object[] = [],
    newAanmeldingen?: IRSVP[]
) => {
    const thresholdDate       = getMarktThresholdDate(role);
    const ondernemerPromise   = getOndernemer(erkenningsNummer);
    const includeInactive     = role === Roles.MARKTMEESTER;
    const marktenPromise      = getMarktenForOndernemer(ondernemerPromise, includeInactive);
    const aanmeldingenPromise = getAanmeldingenByOndernemer(erkenningsNummer);

    return Promise.all([
        ondernemerPromise,
        aanmeldingenPromise,
        marktenPromise,
        getMededelingen()
    ])
    .then(([
        ondernemer,
        aanmeldingen,
        markten,
        mededelingen
    ]) => {
        const sollicitaties = ondernemer.sollicitaties.reduce((result, sollicitatie) => {
            result[sollicitatie.markt.id] = sollicitatie;
            return result;
        }, {});

        if (newAanmeldingen) {
            aanmeldingen = [...aanmeldingen, ...newAanmeldingen].reduce((result, aanmelding) => {
                const existing = result.find(isEqualAanmelding(aanmelding));
                if (existing) {
                    return result;
                }

                const newAanmelding = newAanmeldingen.find(isEqualAanmelding(aanmelding));
                return newAanmelding ?
                       result.concat(newAanmelding) :
                       result.concat(aanmelding);
            }, []);
        }

        return [
            ondernemer,
            sollicitaties,
            groupAanmeldingenPerMarktPerWeek(markten, sollicitaties, aanmeldingen, thresholdDate),
            mededelingen
        ];
    })
    .then(([
        ondernemer,
        sollicitaties,
        aanmeldingenPerMarktPerWeek,
        mededelingen
    ]) => {
        res.render('AanwezigheidPage', {
            aanmeldingenPerMarktPerWeek,
            csrfToken,
            mededelingen,
            messages,
            ondernemer,
            role,
            sollicitaties,
            user: getKeycloakUser(req)
        });
    })
    .catch(err => internalServerErrorPage(res)(err));
};

export const handleAttendanceUpdate = (
    req: GrantedRequest,
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

    // Converteer form data naar echte RSVP objecten. Deze data wordt ook
    // doorgegeven aan de `attendencePage` call hieronder indien er een error is.
    const rsvps: IRSVP[] = data.rsvp.map(rsvpData => ({
        ...rsvpData,
        erkenningsNummer,
        attending: rsvpData.attending === '1'
    }));
    // Groepeer alle RSVPs op datum, zodat we voor elke dag eenvoudig kunnen
    // controleren of het aantal aanmeldingen het maximum overschrijdt.
    const rsvpsByDate: RSVPsGrouped = rsvps.reduce((result, rsvp) => {
        const rsvpDate = new Date(`${rsvp.marktDate} 00:00:00`);
        if (rsvpDate < startDate || rsvpDate > endDate) {
            return result;
        }
        if (!result[rsvp.marktDate]) {
            result[rsvp.marktDate] = [];
        }

        result[rsvp.marktDate].push(rsvp);

        return result;
    }, {});

    // Controleer per dag of het maximum wordt overschreden. Zo ja, geef dan een
    // foutmelding weer.
    getOndernemer(erkenningsNummer)
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
            const errorDaysPretty = errorDays.map(marktDate =>
                moment(marktDate).format('dddd D MMM')
            );
            const errorMessage = {
                code: 'error',
                title: 'Onvoldoende vervangers',
                message: errorDaysPretty.length === 1 ?
                         `U heeft onvoldoende vervangers voor ${errorDaysPretty[0]}` :
                         `U heeft onvoldoende vervangers voor de volgende dagen: ${errorDaysPretty.join(', ')}`
            };

            attendancePage(
                req, res, next,
                role, erkenningsNummer,
                req.csrfToken(),
                [errorMessage],
                rsvps
            );
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
