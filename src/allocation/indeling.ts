import {
    AllocationStrategy,
    IAfwijzingReason,
    IMarkt,
    IMarktindeling,
    IMarktindelingSeed,
    IMarktondernemer,
    IMarktplaats,
    IPlaatsvoorkeur,
    IRSVP
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

type RejectionStrategy = 'reject' | 'ignore';

// Wordt gebruikt in `_findBestePlaatsen` om `IMarktplaats` object om te vormen
// tot `IPlaatsvoorkeur` objecten met een berekend `brancheIntersectCount` getal.
//
// Hierdoor kunnen `priority` en `brancheIntersectCount` gebruikt worden om in
// `_findBestGroup` de meest geschikte set plaatsen te vinden.
interface IPlaatsvoorkeurPlus extends IPlaatsvoorkeur {
    brancheIntersectCount: number;
}

const BRANCHE_FULL: IAfwijzingReason = {
    code: 1,
    message: 'Alle marktplaatsen voor deze branch zijn reeds ingedeeld'
};
const ADJACENT_UNAVAILABLE: IAfwijzingReason = {
    code: 2,
    message: 'Geen geschikte plaats(en) gevonden'
};
const MINIMUM_UNAVAILABLE: IAfwijzingReason = {
    code: 3,
    message: 'Minimum aantal plaatsen niet beschikbaar'
};

const Indeling = {
    init: (markt: IMarkt & IMarktindelingSeed): IMarktindeling => {
        const marktDate = new Date(markt.marktDate);
        if (!+marktDate) {
            throw Error('Invalid market date');
        }

        const openPlaatsen = markt.marktplaatsen.filter(plaats => !plaats.inactive);
        // We willen enkel de aanwezige ondernemers, gesorteerd op prioriteit.
        // De sortering die hier plaatsvindt is van groot belang voor alle hierop
        // volgende code.
        const toewijzingQueue = markt.ondernemers
        .filter(ondernemer =>
            Indeling.isAanwezig(ondernemer, markt.aanwezigheid, marktDate)
        )
        .sort((a, b) => Ondernemers.compare(a, b, markt.aLijst));

        const expansionLimit = Math.min(
            Number.isFinite(markt.expansionLimit) ? markt.expansionLimit : Infinity,
            markt.marktplaatsen.length
        );

        const strategy = Indeling.determineStrategy(toewijzingQueue, openPlaatsen);

        return {
            ...markt,
            openPlaatsen,
            strategy,

            expansionQueue     : [],
            expansionIteration : 1,
            expansionLimit,

            toewijzingQueue,
            afwijzingen        : [],
            toewijzingen       : [],
            voorkeuren         : [...markt.voorkeuren]
        };
    },

    assignPlaatsen: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer,
        plaatsen: IMarktplaats[]           = indeling.openPlaatsen,
        handleRejection: RejectionStrategy = 'reject',
        minimumSize: number                = Ondernemer.getStartSize(ondernemer),
        strategy: AllocationStrategy       = indeling.strategy
    ): IMarktindeling => {
        try {
            if (!plaatsen.length) {
                throw ADJACENT_UNAVAILABLE;
            } else if (
                !Ondernemer.isVast(ondernemer) &&
                Ondernemer.isInMaxedOutBranche(indeling, ondernemer)
            ) {
                throw BRANCHE_FULL;
            }

            const { anywhere = !Ondernemer.isVast(ondernemer) } = ondernemer.voorkeur || {};

            let bestePlaatsen;
            if (minimumSize === 1 && strategy === 'optimistic') {
                const targetSize = Ondernemer.getTargetSize(ondernemer);
                const happySize  = Math.min(targetSize, 2);
                bestePlaatsen = Indeling._findBestePlaatsen(indeling, ondernemer, plaatsen, happySize, anywhere);
            }
            if( !bestePlaatsen || !bestePlaatsen.length ) {
                bestePlaatsen = Indeling._findBestePlaatsen(indeling, ondernemer, plaatsen, minimumSize, anywhere);
            }

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

    canBeAssignedTo: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer,
        plaats: IMarktplaats,
        anywhere: boolean
    ): boolean => {
        const voorkeuren           = Ondernemer.getPlaatsVoorkeuren(indeling, ondernemer);
        const voorkeurIds          = voorkeuren.map(({ plaatsId }) => plaatsId);
        const ondernemerBranches   = Ondernemer.getBranches(indeling, ondernemer);
        const verplichteBrancheIds = ondernemerBranches
                                    .filter(({ verplicht = false }) => verplicht)
                                    .map(({ brancheId }) => brancheId);

        return Indeling._isAvailable(indeling, plaats) && (
            // Als de plaats is toegekend zijn verdere controles onnodig.
            Ondernemer.heeftVastePlaats(ondernemer, plaats) || !(
                // Ondernemer is in verplichte branche, maar plaats voldoet daar niet aan.
                verplichteBrancheIds.length && !intersects(verplichteBrancheIds, plaats.branches) ||
                // Ondernemer heeft een EVI, maar de plaats is hier niet geschikt voor.
                Ondernemer.heeftEVI(ondernemer) && !plaats.verkoopinrichting ||
                // Ondernemer wil niet willekeurig ingedeeld worden en plaats is geen voorkeur.
                !anywhere && !voorkeurIds.includes(plaats.plaatsId)
            )
        );
    },

    determineStrategy: (
        ondernemers: IMarktondernemer[],
        plaatsen: IMarktplaats[]
    ): AllocationStrategy => {
        const minRequired = ondernemers.reduce((sum, ondernemer) => {
            const startSize  = Ondernemer.getStartSize(ondernemer);
            const targetSize = Ondernemer.getTargetSize(ondernemer);
            // TODO: This might be error-prone — are all VPH places branche places?
            //       If not, these places are unnecessarily counted as occupied
            //       branche places.
            const happySize  = Ondernemer.isVast(ondernemer) && startSize >= 2 ?
                               startSize :
                               Math.min(targetSize, 2);

            return sum + happySize;
        }, 0);

        return plaatsen.length >= minRequired ?
               'optimistic' :
               'conservative';
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

        indeling = { ...indeling, expansionIteration: 1 };

        while (
            indeling.openPlaatsen.length &&
            queue.length &&
            indeling.expansionIteration <= indeling.expansionLimit
        ) {
            queue = queue.reduce((newQueue, toewijzing) => {
                const { ondernemer } = toewijzing;

                if (Ondernemer.canExpandInIteration(indeling, toewijzing)) {
                    const openAdjacent = Markt.getAdjacentPlaatsen(indeling, toewijzing.plaatsen, 1);
                    const [uitbreidingPlaats] = Indeling._findBestePlaatsen(indeling, ondernemer, openAdjacent, 1, true);

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

    _findBestGroup: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer,
        groups: IPlaatsvoorkeur[][],
        size: number = 1,
        filter?: (plaats: IMarktplaats) => boolean,
        compare?: (best: IPlaatsvoorkeur[], current: IPlaatsvoorkeur[]) => number
    ): IMarktplaats[] => {
        return groups.reduce((result, group) => {
            if (group.length < size) {
                const depth     = size - group.length;
                const plaatsIds = group.map(({ plaatsId }) => plaatsId);
                const extra     = Markt.getAdjacentPlaatsen(indeling, plaatsIds, depth, filter);
                group = group.concat(<IPlaatsvoorkeur[]> extra);
                // Zet de zojuist toegevoegde plaatsen op de juiste plek.
                group = Markt.groupByAdjacent(indeling, group)[0];
            }

            if (group.length >= size) {
                // Stop `reduce` loop.
                groups.length = 0;
                // Reduceer het aantal plaatsen tot `size`.
                // Pak de subset met de hoogste totale prioriteit.
                return group.reduce((best, plaats, index) => {
                    const current = group.slice(index, index+size);
                    return (!best.length || compare(current, best) < 0) ?
                           current :
                           best;
                }, []);
            } else {
                return result;
            }
        }, []);
    },

    _findBestePlaatsen: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer,
        openPlaatsen: IMarktplaats[],
        size: number = 1,
        anywhere: boolean = false
    ): IMarktplaats[] => {
        const voorkeuren           = Ondernemer.getPlaatsVoorkeuren(indeling, ondernemer);
        const ondernemerBrancheIds = Ondernemer.getBrancheIds(ondernemer);

        // 1. Converteer geschikte plaatsen naar IPlaatsvoorkeur (zodat elke optie
        //    een `priority` heeft).
        // 2. Sorteer op branche overlap en `priority`.
        const plaatsen = <IPlaatsvoorkeurPlus[]> openPlaatsen
        .map(plaats => {
            const { priority = 0 } = voorkeuren.find(({ plaatsId }) => plaatsId === plaats.plaatsId) || {};
            const brancheIntersectCount = intersection(plaats.branches, ondernemerBrancheIds).length;

            return {
                ...plaats,
                priority,
                brancheIntersectCount
            };
        })
        .sort((a, b) =>
            b.brancheIntersectCount - a.brancheIntersectCount ||
            b.priority - a.priority
        );
        // 3. Maak groepen van de plaatsen waar deze ondernemer kan staan (Zie `plaatsFilter`)
        const groups = Markt.groupByAdjacent(indeling, plaatsen, plaats =>
            Indeling.canBeAssignedTo(indeling, ondernemer, plaats, anywhere)
        );

        // 4. Geef de meest geschikte groep terug.
        return Indeling._findBestGroup(
            indeling,
            ondernemer,
            groups,
            size,
            plaats => Indeling.canBeAssignedTo(indeling, ondernemer, plaats, true),
            (a: IPlaatsvoorkeurPlus[], b: IPlaatsvoorkeurPlus[]) => {
                // Kijk eerst of er een betere branche overlap is...
                let aScore = a.map(pl => pl.brancheIntersectCount).reduce(sum, 0);
                let bScore = b.map(pl => pl.brancheIntersectCount).reduce(sum, 0);
                if (bScore - aScore) {
                    return bScore - aScore;
                }
                // ... en sorteer anders op prioriteit.
                aScore = a.map(pl => pl.priority).reduce(sum, 0);
                bScore = b.map(pl => pl.priority).reduce(sum, 0);
                return bScore - aScore;
            }
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
        indeling = Toewijzing.remove(indeling, ondernemer);

        const afwijzing = indeling.afwijzingen.find(({ erkenningsNummer }) =>
            erkenningsNummer === ondernemer.erkenningsNummer
        );
        if( !afwijzing ) {
            indeling.afwijzingen = indeling.afwijzingen.concat({
                marktId          : indeling.marktId,
                marktDate        : indeling.marktDate,
                erkenningsNummer : ondernemer.erkenningsNummer,
                reason,
                ondernemer
            });
        }

        return indeling;
    }
};

export default Indeling;
