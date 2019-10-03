import {
    IAfwijzingReason,
    IMarkt,
    IMarktindeling,
    IMarktindelingSeed,
    IMarktondernemer,
    IMarktplaats,
    IPlaatsvoorkeur,
    IRSVP,
    PlaatsId
} from '../markt.model';

import {
    intersection,
    intersects,
    sum
} from '../util';

import Markt from './markt';
import Ondernemer from './ondernemer';
import Ondernemers from './ondernemers';
import Toewijzing from './toewijzing';

const MARKET_FULL: IAfwijzingReason = {
    code: 1,
    message: 'Alle marktplaatsen zijn reeds ingedeeld'
};
const BRANCHE_FULL: IAfwijzingReason = {
    code: 2,
    message: 'Alle marktplaatsen voor deze branch zijn reeds ingedeeld'
};
const ADJACENT_UNAVAILABLE: IAfwijzingReason = {
    code: 3,
    message: 'Geen geschikte plaats(en) gevonden'
};
const MINIMUM_UNAVAILABLE: IAfwijzingReason = {
    code: 4,
    message: 'Minimum aantal plaatsen niet beschikbaar'
};

const Indeling = {
    init: (markt: IMarkt & IMarktindelingSeed): IMarktindeling => {
        const marktDate = new Date(markt.marktDate);
        if (!+marktDate) {
            throw Error('Invalid market date');
        }

        return {
            ...markt,
            toewijzingQueue: markt.ondernemers
                .filter(ondernemer =>
                    Indeling.isAanwezig(ondernemer, markt.aanwezigheid, new Date(markt.marktDate))
                )
                .sort((a, b) => Ondernemers.compare(a, b, markt.aLijst)),
            expansionQueue: [],
            expansionIteration: 1,
            expansionLimit: Math.min(
                Number.isFinite(markt.expansionLimit) ? markt.expansionLimit : Infinity,
                markt.marktplaatsen.length
            ),
            afwijzingen: [],
            toewijzingen: [],
            openPlaatsen: [...markt.marktplaatsen.filter(plaats => !plaats.inactive)],
            voorkeuren: [...markt.voorkeuren]
        };
    },

    assignPlaats: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer,
        plaatsen: IMarktplaats[],
        handleRejection: 'reject' | 'ignore' = 'reject',
        maximum: number = 1
    ): IMarktindeling => {
        try {
            if (indeling.openPlaatsen.length === 0) {
                throw MARKET_FULL;
            } else if (Ondernemer.isInMaxedOutBranche(indeling, ondernemer)) {
                throw BRANCHE_FULL;
            }

            if (!plaatsen || !plaatsen.length) {
                throw Error('assignPlaats vereist een set aan open plaatsen');
            }

            const bestePlaatsen = Indeling.findBestePlaatsen(indeling, ondernemer, plaatsen, maximum);
            if (!bestePlaatsen.length) {
                throw ADJACENT_UNAVAILABLE;
            }

            return bestePlaatsen.reduce((indeling, plaats) => {
                return Toewijzing.add(indeling, ondernemer, plaats);
            }, indeling);
        } catch (errorMessage) {
            return handleRejection === 'reject' ?
                   Indeling._rejectOndernemer(indeling, ondernemer, errorMessage) :
                   indeling;
        }
    },

    assignVastePlaatsen: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer
    ): IMarktindeling => {
        const available   = Indeling.findBestePlaatsenForVPH(indeling, ondernemer);
        // const { anywhere  = false } = ondernemer.voorkeur || {};
        const minimumSize = Ondernemer.getMinimumSize(ondernemer);

        if (available.length && available.length >= minimumSize) {
            return available.reduce((indeling, plaats) => {
                return Toewijzing.add(indeling, ondernemer, plaats);
            }, indeling);
        } else /*if (anywhere)*/ {
            /*const startSize    = Ondernemer.getStartSize(ondernemer);
            const openPlaatsen = indeling.openPlaatsen.filter(plaats =>
                Indeling._isAvailable(indeling, plaats)
            );
            return Indeling.assignPlaats(indeling, ondernemer, openPlaatsen, 'reject', startSize);
        } else {*/
            return Indeling._rejectOndernemer(indeling, ondernemer, ADJACENT_UNAVAILABLE);
        }
    },

    findBestePlaatsen: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer,
        openPlaatsen: IMarktplaats[],
        minimumSize: number = 1
    ): IMarktplaats[] => {
        const voorkeuren           = Ondernemer.getPlaatsVoorkeuren(indeling, ondernemer);
        const ondernemerBranches   = Ondernemer.getBranches(indeling, ondernemer);

        const { anywhere = true }  = ondernemer.voorkeur || {};
        const voorkeurIds          = voorkeuren.map(({ plaatsId }) => plaatsId);
        const verplichteBrancheIds = ondernemerBranches
                                    .filter(({ verplicht = false }) => verplicht)
                                    .map(({ brancheId }) => brancheId);

        // Hier gebeuren 3 dingen:
        // 1. Filter ongeschikte plaatsen eruit.
        // 2. Converteer geschikte plaatsen naar IPlaatsvoorkeur (zodat elke optie
        //    een `priority` heeft).
        // 3. Sorteer op branche overlap en `priority`.
        const plaatsen = <IPlaatsvoorkeur[]> openPlaatsen
        .reduce((result, plaats) => {
            if (
                // Ondernemer is in verplichte branche, maar plaats voldoet daar niet aan.
                verplichteBrancheIds.length && !intersects(verplichteBrancheIds, plaats.branches) ||
                // Ondernemer heeft een EVI, maar de plaats is hier niet geschikt voor.
                Ondernemer.heeftEVI(ondernemer) && !plaats.verkoopinrichting ||
                // Ondernemer wil niet willekeurig ingedeeld worden en plaats is geen voorkeur.
                !anywhere && !voorkeurIds.includes(plaats.plaatsId)
            ) {
                return result;
            }

            const { priority = 0 } = voorkeuren.find(({ plaatsId }) => plaatsId === plaats.plaatsId) || {};
            return result.concat({ ...plaats, priority });
        }, [])
        .sort((a, b) =>
            intersection(b.branches, ondernemerBranches).length -
            intersection(a.branches, ondernemerBranches).length
            ||
            b.priority - a.priority
        );

        return Indeling._findBestGroup(
            indeling,
            ondernemer,
            Markt.groupByAdjacent(indeling, plaatsen),
            minimumSize,
            (best, current) => {
                // TODO: Kijkt enkel naar `priority`, maar branche overlap is belangrijker.
                const bestScore = best.map(({ priority }) => priority).reduce(sum, 0);
                const curScore  = current.map(({ priority }) => priority).reduce(sum, 0);
                return bestScore - curScore;
            }
        );
    },

    findBestePlaatsenForVPH: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer
    ): IMarktplaats[] => {
        const minimumSize = Ondernemer.getStartSize(ondernemer);
        const voorkeuren  = Ondernemer.getPlaatsVoorkeuren(indeling, ondernemer);
        const groups      = Markt.groupByAdjacent(indeling, voorkeuren, plaats =>
            Indeling._isAvailable(indeling, plaats)
        );

        return Indeling._findBestGroup(
            indeling, ondernemer, groups, minimumSize,
            (best, current) => {
                const bestScore = best.map(({ priority }) => priority).reduce(sum, 0);
                const curScore  = current.map(({ priority }) => priority).reduce(sum, 0);
                return bestScore - curScore;
            }
        );
    },

    _findBestGroup: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer,
        groups: IPlaatsvoorkeur[][],
        minimumSize: number = 1,
        compare?: (best: IPlaatsvoorkeur[], current: IPlaatsvoorkeur[]) => number
    ): IMarktplaats[] => {
        return groups.reduce((result, group) => {
            if (group.length < minimumSize) {
                const depth     = minimumSize - group.length;
                const plaatsIds = group.map(({ plaatsId }) => plaatsId);
                const extra     = Indeling._getAvailableAdjacentFor(indeling, plaatsIds, depth);
                group = group.concat(<IPlaatsvoorkeur[]> extra);
                // Put the added places in the right order.
                group = Markt.groupByAdjacent(indeling, group)[0];
            }

            if (group.length >= minimumSize) {
                // Stop `reduce` loop.
                groups.length = 0;
                // Reduceer het aantal plaatsen tot `minimumSize`..
                // Pak de subset met de hoogste totale prioriteit.
                return group.reduce((best, plaats, index) => {
                    const current = group.slice(index, index+minimumSize);
                    return (!best.length || compare(best, current) < 0) ?
                           current :
                           best;
                }, []);
            } else {
                return result;
            }
        }, []);
    },

    // Als niet alle vaste plaatsen van een VPH beschikbaar zijn zal hij
    // moeten verplaatsen. Voor de berekening beschouwing we deze ondernemer
    // als iemand die verplaatst.
    hasToMove: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer
    ): boolean => {
        const vastePlaatsen = Ondernemer.getVastePlaatsen(indeling, ondernemer);
        const beschikbaar = vastePlaatsen.filter(plaats => Indeling._isAvailable(indeling, plaats));
        return beschikbaar.length < vastePlaatsen.length;
    },

    isAanwezig: (
        ondernemer: IMarktondernemer,
        aanmeldingen: IRSVP[],
        marktDate: Date
    ) => {
        const { absentFrom = null, absentUntil = null } = ondernemer.voorkeur || {};
        if (
            absentFrom && absentUntil &&
            marktDate >= new Date(absentFrom) &&
            marktDate <= new Date(absentUntil)
        ) {
            return false;
        }

        const rsvp = aanmeldingen.find(({ erkenningsNummer }) =>
            erkenningsNummer === ondernemer.erkenningsNummer
        );
        // Bij de indeling van VPHs worden alleen expliciete afmeldingen in beschouwing
        // genomen. Anders wordt een VPH automatisch als aangemeld beschouwd.
        return Ondernemer.isVast(ondernemer) ?
               !rsvp || !!rsvp.attending || rsvp.attending === null :
               !!rsvp && !!rsvp.attending;
    },

    performExpansion: (
        indeling: IMarktindeling
    ): IMarktindeling => {
        let queue = indeling.toewijzingen.filter(toewijzing =>
            Ondernemer.wantsExpansion(toewijzing)
        );

        while (
            indeling.openPlaatsen.length &&
            queue.length &&
            indeling.expansionIteration <= indeling.expansionLimit
        ) {
            queue = queue.reduce((newQueue, toewijzing) => {
                const { ondernemer } = toewijzing;

                if (Ondernemer.canExpandInIteration(indeling, toewijzing)) {
                    const openAdjacent        = Indeling._getAvailableAdjacentFor(indeling, toewijzing.plaatsen, 1);
                    const [uitbreidingPlaats] = Indeling.findBestePlaatsen(indeling, ondernemer, openAdjacent);

                    if (uitbreidingPlaats) {
                        indeling   = Toewijzing.add(indeling, ondernemer, uitbreidingPlaats);
                        toewijzing = Toewijzing.find(indeling, ondernemer);
                    }
                }

                if (Ondernemer.wantsExpansion(toewijzing)) {
                    newQueue.push(toewijzing);
                }

                return newQueue;
            }, []);

            indeling.expansionIteration++;
        }

        // The people still in the queue have fewer places than desired. Check if they
        // must be rejected because of their `minimum` setting.
        return queue.reduce((indeling, { ondernemer, plaatsen }) => {
            const { minimum = 0 } = ondernemer.voorkeur || {};
            return minimum > plaatsen.length ?
                   Indeling._rejectOndernemer(indeling, ondernemer, MINIMUM_UNAVAILABLE) :
                   indeling;
        }, indeling);
    },

    _getAvailableAdjacentFor: (
        indeling: IMarktindeling,
        plaatsIds: PlaatsId[],
        depth: number = 1
    ): IMarktplaats[] => {
        return Markt.getAdjacentPlaatsen(indeling, plaatsIds, depth, (plaats) =>
            Indeling._isAvailable(indeling, plaats)
        );
    },

    _isAvailable: (
        indeling: IMarktindeling,
        plaats: IMarktplaats
    ): boolean => {
        return !!~indeling.openPlaatsen.findIndex(({ plaatsId }) =>
            plaatsId === plaats.plaatsId
        );
    },

    _rejectOndernemer: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer,
        reason: IAfwijzingReason
    ): IMarktindeling => {
        return {
            ...Toewijzing.remove(indeling, ondernemer),
            afwijzingen: indeling.afwijzingen.concat({
                marktId          : indeling.marktId,
                marktDate        : indeling.marktDate,
                erkenningsNummer : ondernemer.erkenningsNummer,
                reason,
                ondernemer
            })
        };
    }
};

export default Indeling;
