import {
    IAfwijzingReason,
    IMarktindeling,
    IMarktondernemer,
    IMarktplaats,
    IPlaatsvoorkeur,
    IRSVP,
    IToewijzing
} from '../markt.model';

import {
    log
} from '../util';

import Ondernemer from './ondernemer';
import Toewijzing from './toewijzing';

// `voorkeuren` should always be sorted by priority DESC, because we're using its array
// indices to sort by priority. See `Ondernemer.getVoorkeuren()`.
const plaatsVoorkeurCompare = (plaatsA: IMarktplaats, plaatsB: IMarktplaats, voorkeuren: IPlaatsvoorkeur[]): number => {
    const max = voorkeuren.length;
    const a   = voorkeuren.findIndex(({ plaatsId }) => plaatsId === plaatsA.plaatsId);
    const b   = voorkeuren.findIndex(({ plaatsId }) => plaatsId === plaatsB.plaatsId);
    // Bit ~-1 == 0, so we can kick a or b to EOL if it's not found.
    return (~a ? a : max) - (~b ? b : max);
};

const Indeling = {
    assignPlaats: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer,
        plaats: IMarktplaats,
        conflictResolution: 'merge' | 'reassign' | 'keep-both' = 'keep-both'
    ): IMarktindeling => {
        const toewijzing = Toewijzing.create(indeling, plaats, ondernemer);
        log(`Plaats toegewezen aan ${ondernemer.erkenningsNummer}: ${toewijzing.plaatsen}`);

        const existingToewijzing = Toewijzing.find(indeling, ondernemer);
        let newToewijzing: IToewijzing = {
            marktId: indeling.marktId,
            marktDate: indeling.marktDate,
            plaatsen: [...toewijzing.plaatsen],
            erkenningsNummer: ondernemer.erkenningsNummer,

            // For convenience, access to the full object
            ondernemer
        };

        if (existingToewijzing) {
            log(`Ondernemer is reeds toegwezen aan plaats(en): ${existingToewijzing.plaatsen.join(', ')}`);

            if (conflictResolution === 'merge') {
                newToewijzing = Toewijzing.merge(existingToewijzing, newToewijzing);
            }

            if (conflictResolution !== 'keep-both') {
                indeling = Toewijzing.remove(indeling, existingToewijzing);
            }
        }

        return Toewijzing.add(indeling, newToewijzing);
    },

    assignVastePlaatsen: (indeling: IMarktindeling, ondernemer: IMarktondernemer): IMarktindeling => {
        const beschikbaar = Indeling.getVastePlaatsenFor(indeling, ondernemer);

        // FIXME: Handle rejections correctly
        // FIXME: ondernemer doesn't have to be rejected when they can move to another open spot
        // `beschikbaar.length < ondernemer.plaatsen.length &&
        if (beschikbaar.length === 0) {
            return Indeling.rejectOndernemer(indeling, ondernemer, { message: 'Vaste plaats(en) niet beschikbaar' });
        } else {
            const maxPlaatsen = ondernemer.voorkeur && ondernemer.voorkeur.maximum ?
                                Math.min(beschikbaar.length, ondernemer.voorkeur.maximum) :
                                beschikbaar.length;

            return beschikbaar
            .slice(0, maxPlaatsen)
            .reduce((indeling, plaats) => {
                return Indeling.assignPlaats(indeling, ondernemer, plaats, 'merge');
            }, indeling);
        }
    },

    // Returns the vaste plaatsen that are still available for this ondernemer in the
    // current indeling.
    getVastePlaatsenFor: (indeling: IMarktindeling, ondernemer: IMarktondernemer): IMarktplaats[] => {
        const voorkeuren = Ondernemer.getVoorkeuren(indeling, ondernemer);
        return indeling.openPlaatsen
               .filter(plaats => Ondernemer.heeftVastePlaats(ondernemer, plaats))
               .sort((a, b) => plaatsVoorkeurCompare(a, b, voorkeuren));
    },

    isAanwezig: (aanwezigheid: IRSVP[], ondernemer: IMarktondernemer) => {
        const rsvp = aanwezigheid.find(aanmelding => aanmelding.erkenningsNummer === ondernemer.erkenningsNummer);

        /*
         * Vasteplaatshouders die niets hebben laten weten en die hebben bevestigd dat ze
         * komen worden meegeteld als aanwezig. Alleen de expliciete afmeldingen worden
         * niet in overweging genomen in de toedeling van kramen.
         */
        if (ondernemer.status === 'vpl') {
            return !rsvp || !!rsvp.attending || rsvp.attending === null;
        } else {
            return !!rsvp && !!rsvp.attending;
        }
    },

    rejectOndernemer: (indeling: IMarktindeling, ondernemer: IMarktondernemer, reason: IAfwijzingReason): IMarktindeling => {
        const afwijzingen = [
            ...indeling.afwijzingen,
            {
                marktId          : indeling.marktId,
                marktDate        : indeling.marktDate,
                erkenningsNummer : ondernemer.erkenningsNummer,
                reason,
                ondernemer
            }
        ];

        return { ...indeling, afwijzingen };
    }
};

export default Indeling;
