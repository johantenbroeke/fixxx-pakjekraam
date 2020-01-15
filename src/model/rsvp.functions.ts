import { rsvp } from './index';
import { RSVP } from './rsvp.model';
import { IRSVP } from 'markt.model';

import { MMSollicitatie } from '../makkelijkemarkt.model';
import { getSollicitatiesByMarktFases } from '../makkelijkemarkt-api';
import { isVast } from '../domain-knowledge';

export const getAanmeldingenByOndernemer = (erkenningsNummer: string): Promise<IRSVP[]> =>
    rsvp
        .findAll<RSVP>({
            where: { erkenningsNummer },
            raw: true,
        })
        .then(aanmeldingen => aanmeldingen);


export const deleteRsvpsByErkenningsnummer = (erkenningsNummer: string) =>
    rsvp.destroy({ where: { erkenningsNummer } });

/*
 * Vendors are allowed to attend only one market per day.
 * Check if a vendor wants to apply for a market, while on the same day it has applied for others.
 */
export const isConflictingApplication = (aanmeldingen: IRSVP[], application: IRSVP): IRSVP[] => {
    if (application.attending) {
        const conflictingAanmeldingen = aanmeldingen
            .filter(a => String(a.marktId) !== String(application.marktId))
            .filter(a => a.marktDate === application.marktDate)
            .filter(a => a.attending !== null && !!a.attending);
        return conflictingAanmeldingen;
    } else {
        return [];
    }
};

export const isConflictingSollicitatie = (aanmeldingen: IRSVP[], sollicitaties: MMSollicitatie[], application: IRSVP): MMSollicitatie[] => {

    if (application.attending) {

        const afmeldingen = aanmeldingen
            .filter(a => !a.attending)
            .filter(a => String(a.marktId) !== String(application.marktId))
            .filter(a => a.marktDate === application.marktDate);

        const conflictingSollicitatiesVPH = sollicitaties
            .filter(sollicitatie => String(sollicitatie.markt.id) !== String(application.marktId))
            .filter(sollicitatie => isVast(sollicitatie.status))
            .filter(sollicitatie => !afmeldingen.find(afmelding => parseInt(afmelding.marktId) === sollicitatie.markt.id));

        return conflictingSollicitatiesVPH;
    } else {
        return [];
    }
};

export const getConflictingSollicitaties = (application: IRSVP): Promise<MMSollicitatie[]> =>
    Promise.all([getAanmeldingenByOndernemer(application.erkenningsNummer), getSollicitatiesByMarktFases(application.erkenningsNummer, ['activate','wenperiode','live'])])
        .then( ([aanmeldingen, sollicitaties]) => {
            return isConflictingSollicitatie(aanmeldingen, sollicitaties, application);
        });


export const getConflictingApplications = (application: IRSVP): Promise<IRSVP[]> =>
    getAanmeldingenByOndernemer(application.erkenningsNummer)
        .then( (aanmeldingen) =>
            isConflictingApplication(aanmeldingen, application)
        );
