import {
    IAfwijzingReason,
    IBranche,
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

import Markt from './markt';
import Ondernemer from './ondernemer';
import Toewijzing from './toewijzing';

const FULL_REASON: IAfwijzingReason = {
    code: 1,
    message: 'Alle marktplaatsen zijn reeds ingedeeld'
};
const BRANCHE_FULL_REASON: IAfwijzingReason = {
    code: 2,
    message: 'Alle marktplaatsen voor deze branch zijn reeds ingedeeld'
};

// `voorkeuren` should always be sorted by priority DESC, because we're using its array
// indices to sort by priority. See `Ondernemer.getVoorkeurPlaatseng()`.
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

    findBestePlaats: (
        ondernemer: IMarktondernemer,
        openPlaatsen: IMarktplaats[],
        indeling: IMarktindeling,
        maximum: number = 1
    ) => {
        let mogelijkePlaatsen = openPlaatsen;

        // log(`Vind een plaats voor ${ondernemer.id}`);
        const ondernemerBranches = Ondernemer.getBranches(indeling, ondernemer);
        const voorkeuren = Ondernemer.getVoorkeurPlaatsen(indeling, ondernemer);

        mogelijkePlaatsen = ondernemerBranches.reduce(
            (mogelijkePlaatsen: IMarktplaats[], branche: IBranche): IMarktplaats[] => {
                if (branche.verplicht) {
                    /*
                     * Bijvoorbeeld: als de ondernemer een wil frituren (`{ "branche": "bak" }`)
                     * dan blijven alleen nog de kramen over waarop frituren is toegestaan.
                     */
                    mogelijkePlaatsen = mogelijkePlaatsen.filter(
                        plaats => plaats.branches && plaats.branches.find(brancheId => brancheId === branche.brancheId)
                    );
                    log(
                        `Filter op branche: ${branche.brancheId} (${mogelijkePlaatsen.length}/${openPlaatsen.length} over)`
                    );
                } else {
                    log(`Sorteer op branche: ${branche.brancheId}`);
                    /*
                     * Een groenteboer wordt bij voorkeur geplaatst op een plaats in de branch AGF.
                     */
                    mogelijkePlaatsen = [...mogelijkePlaatsen].sort((a, b) => {
                        if (a.branches && a.branches.includes(branche.brancheId)) {
                            return -1;
                        } else if (b.branches && b.branches.includes(branche.brancheId)) {
                            return 1;
                        } else {
                            return 0;
                        }
                    });
                }

                return mogelijkePlaatsen;
            },
            mogelijkePlaatsen
        );

        if (ondernemer.voorkeur && typeof ondernemer.voorkeur.anywhere === 'boolean' && !ondernemer.voorkeur.anywhere) {
            const voorkeurIds = voorkeuren.map(({ plaatsId }) => plaatsId);
            mogelijkePlaatsen = mogelijkePlaatsen.filter(({ plaatsId }) => voorkeurIds.includes(plaatsId));
        }

        mogelijkePlaatsen.sort((a, b) => plaatsVoorkeurCompare(a, b, voorkeuren));

        if (maximum > 1) {
            log(`Ondernemer ${ondernemer.erkenningsNummer} wil in één keer ${maximum} plaatsen`);
            const prevMogelijkePlaatsen = mogelijkePlaatsen;
            mogelijkePlaatsen = mogelijkePlaatsen.filter(p => {
                const expansionSize = maximum - 1;
                const adjacent = Markt.getAdjacentPlaatsenRecursive(indeling.rows, p.plaatsId, expansionSize, indeling.obstakels);

                return adjacent.length >= expansionSize;
            });

            log(
                'Van deze plaatsen: ',
                prevMogelijkePlaatsen.map(({ plaatsId }) => plaatsId),
                ` hebben de volgende mogelijkheid tot uitbreiden naar ${maximum} plaatsen: `,
                mogelijkePlaatsen.map(({ plaatsId }) => plaatsId)
            );
        }

        return mogelijkePlaatsen[0];
    },

    findPlaats: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer,
        plaatsen: IMarktplaats[],
        handleRejection: 'reject' | 'ignore' = 'reject',
        maximum: number = 1
    ): IMarktindeling => {
        try {
            if (indeling.openPlaatsen.length === 0) {
                throw FULL_REASON;
            } else if (Ondernemer.isInMaxedOutBranche(indeling, ondernemer)) {
                throw BRANCHE_FULL_REASON;
            }

            const mogelijkePlaatsen = plaatsen || indeling.openPlaatsen;
            const plaats = Indeling.findBestePlaats(ondernemer, mogelijkePlaatsen, indeling, maximum);
            if (!plaats) {
                throw 'Geen plaats gevonden';
            }

            return Indeling.assignPlaats(indeling, ondernemer, plaats, 'reassign');
        } catch (errorMessage) {
            log(`Geen plaats gevonden voor ${ondernemer.erkenningsNummer}`);
            return handleRejection === 'reject' ?
                   Indeling.rejectOndernemer(indeling, ondernemer, errorMessage) :
                   indeling;
        }
    },

    // Returns the vaste plaatsen that are still available for this ondernemer in the
    // current indeling.
    getVastePlaatsenFor: (indeling: IMarktindeling, ondernemer: IMarktondernemer): IMarktplaats[] => {
        const voorkeuren = Ondernemer.getVoorkeurPlaatsen(indeling, ondernemer);
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
