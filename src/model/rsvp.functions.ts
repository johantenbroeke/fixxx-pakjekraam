import { rsvp } from './index';
import { RSVP } from './rsvp.model';
import { IRSVP } from 'markt.model';

import { MMSollicitatie } from '../makkelijkemarkt.model';
import { getSollicitatiesByMarktFases } from '../makkelijkemarkt-api';
import { isVast } from '../domain-knowledge';

const getAanmeldingenByOndernemer = (erkenningsNummer: string): Promise<IRSVP[]> => {
    return rsvp.findAll<RSVP>({
        where: { erkenningsNummer },
        raw: true,
    })
    .then(aanmeldingen => aanmeldingen);
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
        getSollicitatiesByMarktFases(aanmelding.erkenningsNummer, ['activate','wenperiode','live'])
    ])
    .then( ([aanmeldingen, sollicitaties]) =>
        isConflictingSollicitatie(aanmeldingen, sollicitaties, aanmelding)
    );
};


export const getConflictingApplications = (aanmelding: IRSVP): Promise<IRSVP[]> =>
    getAanmeldingenByOndernemer(aanmelding.erkenningsNummer)
    .then(aanmeldingen =>
        isConflictingApplication(aanmeldingen, aanmelding)
    );
