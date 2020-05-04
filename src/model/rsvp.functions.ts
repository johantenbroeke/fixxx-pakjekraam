import moment from 'moment-timezone';

import { rsvp } from './index';
import { RSVP } from './rsvp.model';
import { IRSVP } from 'markt.model';

import {
    MMMarkt,
    MMOndernemerStandalone,
    MMSollicitatie
} from '../makkelijkemarkt.model';
import { getSollicitatiesByOndernemer } from '../makkelijkemarkt-api';
import { getAanmeldingenByOndernemer } from '../pakjekraam-api';
import {
    isVast,
    getMarktThresholdDate,
    filterRsvpList
} from '../domain-knowledge';

const {
    endOfWeek,
} = require('../util.ts');

export const groupAanmeldingenPerMarktPerWeek = (
    markten: MMMarkt[],
    sollicitaties: { [marktId: number]: MMSollicitatie },
    aanmeldingen: IRSVP[],
    thresholdDate: Date
): object[] => {
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

    const aanmeldingenPerMarktPerWeek = markten.map(markt => {
        const aanmeldingen = (aanmeldingenPerMarkt[markt.id] || []).filter(({ marktId }) =>
            Number(marktId) === Number(markt.id)
        );
        const aanmeldingenPerDag = filterRsvpList(aanmeldingen, markt);

        const aanmeldingenPerWeek = aanmeldingenPerDag.reduce((result, { date, rsvp }) => {
            // Voeg de tijd toe, zodat we een datum in de huidige tijdszone krijgen.
            // Doen we dit niet, dan wordt de datum ingesteld op UTC. Aangezien wij in de
            // zomer op UTC+2 zitten is de datumwissel bij ons twee uur eerder. Gebruikers
            // zouden in dit geval twee uur na de automatische indeling hun aanwezigheid nog
            // kunnen aanpassen
            date = new Date(`${date} 00:00:00`);

            const week        = date > new Date(endOfWeek()) ? 1 : 0;
            const weekDay     = date.getDay();
            const attending   = rsvp ? rsvp.attending : isVast(sollicitaties[markt.id].status);
            const isInThePast = date < thresholdDate;

            result[week][weekDay] = {
                date,
                attending,
                isInThePast
            };

            return result;
        }, [{}, {}]);

        return {
            markt,
            aanmeldingenPerWeek
        };
    });

    return aanmeldingenPerMarktPerWeek;
};

/*
 * Vendors are allowed to attend only one market per day.
 * Check if a vendor wants to apply for a market, while on the same day it has applied for others.
 */
const isConflictingApplication = (
    aanmeldingen: IRSVP[],
    aanmelding: IRSVP
): IRSVP[] => {
    if (!aanmelding.attending) {
        return [];
    }

    return aanmeldingen.filter(_aanmelding =>
        String(_aanmelding.marktId) !== String(aanmelding.marktId) &&
        _aanmelding.marktDate === aanmelding.marktDate &&
        _aanmelding.attending !== null && !!_aanmelding.attending
    );
};

const isConflictingSollicitatie = (
    aanmeldingen: IRSVP[],
    sollicitaties: MMSollicitatie[],
    aanmelding: IRSVP
): MMSollicitatie[] => {
    if (!aanmelding.attending) {
        return [];
    }

    const afmeldingen = aanmeldingen.filter(_aanmelding =>
        !_aanmelding.attending &&
        String(_aanmelding.marktId) !== String(aanmelding.marktId) &&
        _aanmelding.marktDate === aanmelding.marktDate
    );

    return sollicitaties.filter(sollicitatie =>
        String(sollicitatie.markt.id) !== String(aanmelding.marktId) &&
        isVast(sollicitatie.status) &&
        !afmeldingen.find(afmelding => parseInt(afmelding.marktId) === sollicitatie.markt.id)
    );
};

export const getAanmeldingenByMarktAndDate = (
    marktId: string,
    marktDate: string
): Promise<IRSVP[]> => {
    return rsvp.findAll<RSVP>({
        where: { marktId, marktDate },
        raw: true,
    })
    .then(aanmeldingen => aanmeldingen);
};

export const deleteRsvpsByErkenningsnummer = (erkenningsNummer: string) => {
    return rsvp.destroy({ where: { erkenningsNummer } });
};

export const getConflictingSollicitaties = (aanmelding: IRSVP): Promise<MMSollicitatie[]> => {
    return Promise.all([
        getAanmeldingenByOndernemer(aanmelding.erkenningsNummer),
        getSollicitatiesByOndernemer(aanmelding.erkenningsNummer)
    ])
    .then( ([aanmeldingen, sollicitaties]) =>
        isConflictingSollicitatie(aanmeldingen, sollicitaties, aanmelding)
    );
};

export const getConflictingApplications = (aanmelding: IRSVP): Promise<IRSVP[]> => {
    return getAanmeldingenByOndernemer(aanmelding.erkenningsNummer)
    .then(aanmeldingen =>
        isConflictingApplication(aanmeldingen, aanmelding)
    );
};
