import {
    IAfwijzingReason,
    IBranche,
    IMarkt,
    IMarktindeling,
    IMarktindelingSeed,
    IMarktondernemer,
    IMarktplaats,
    IObstakelBetween,
    IPlaatsvoorkeur,
    IToewijzing,
    PlaatsId
} from './markt.model';

import {
    count,
    exclude,
    flatten,
    intersection,
    intersects,
    isEqualArray,
    log,
    unique
} from './util';

import Indeling from './allocation/indeling';
import Ondernemers from './allocation/ondernemers';
import Ondernemer from './allocation/ondernemer';
import Toewijzing from './allocation/toewijzing';

/*
 * https://decentrale.regelgeving.overheid.nl/cvdr/XHTMLoutput/Actueel/Amsterdam/396119.html#id1-3-2-2-3-4-5
 */
const FULL_REASON: IAfwijzingReason = {
    code: 1,
    message: 'Alle marktplaatsen zijn reeds ingedeeld'
};
const BRANCHE_FULL_REASON: IAfwijzingReason = {
    code: 2,
    message: 'Alle marktplaatsen voor deze branch zijn reeds ingedeeld'
};

// `voorkeuren` should always be sorted by priority DESC, because we're using its array
// indices to sort by priority. See `Ondernemer.getVoorkeuren()`.
const plaatsVoorkeurCompare = (plaatsA: IMarktplaats, plaatsB: IMarktplaats, voorkeuren: IPlaatsvoorkeur[]): number => {
    const max = voorkeuren.length;
    const a   = voorkeuren.findIndex(({ plaatsId }) => plaatsId === plaatsA.plaatsId);
    const b   = voorkeuren.findIndex(({ plaatsId }) => plaatsId === plaatsB.plaatsId);
    // Bit ~-1 == 0, so we can kick a or b to EOL if it's not found.
    return (~a ? a : max) - (~b ? b : max);
};

export const getAdjacentPlaatsen = (
    rows: IMarktplaats[][],
    plaatsId: PlaatsId,
    obstakels: IObstakelBetween[] = []
): IMarktplaats[] => {
    return rows.map(row => {
        const targetIndex = row.findIndex(plaats => plaats.plaatsId === plaatsId);

        return targetIndex !== -1 ?
               row.filter((_, index) => index === targetIndex - 1 || index === targetIndex + 1) :
               [];
    })
    .reduce(flatten, [])
    .filter(plaatsB => {
        // Does this place border an obstacle?
        return !obstakels.some(obstakel => {
            const plaatsIdA = plaatsId;
            const plaatsIdB = plaatsB.plaatsId;

            return (obstakel.kraamA === plaatsIdA && obstakel.kraamB === plaatsIdB) ||
                   (obstakel.kraamA === plaatsIdB && obstakel.kraamB === plaatsIdA);
        });
    });
};

/*
 * Returns adjacent places in either direction,
 * `steps` defines the limit of how far to look in either direction.
 * The number of adjacent spots can be greater than  the number of steps, if a number
 * of spots is available in either direction.
 */
export const getAdjacentPlaatsenRecursive = (
    rows: IMarktplaats[][],
    plaatsId: string,
    steps: number = 1,
    obstakels: IObstakelBetween[] = []
): string[] => {
    let plaatsen: string[] = [plaatsId],
        prevPlaatsen: string[] = [],
        i = 0;

    while (i < steps && !isEqualArray(plaatsen, prevPlaatsen)) {
        const newPlaatsen: string[] = exclude(plaatsen, prevPlaatsen);
        prevPlaatsen = plaatsen;

        const adjacentPlaatsen = newPlaatsen
            .map(p => getAdjacentPlaatsen(rows, p, obstakels))
            .reduce(flatten, [])
            .map(({ plaatsId }) => plaatsId);

        plaatsen = [...plaatsen, ...adjacentPlaatsen];

        i++;
    }

    plaatsen = exclude(plaatsen, [plaatsId]);

    return plaatsen;
};

const getAdjacentPlaatsenForMultiple = (
    rows: IMarktplaats[][],
    plaatsIds: PlaatsId[],
    obstakels: IObstakelBetween[] = []
): IMarktplaats[] =>
    plaatsIds
        .map(plaatsId => getAdjacentPlaatsen(rows, plaatsId, obstakels))
        .reduce(flatten, [])
        .reduce(unique, []);

const findOptimalSpot = (
    ondernemer: IMarktondernemer,
    openPlaatsen: IMarktplaats[],
    indeling: IMarktindeling,
    maximum: number = 1
) => {
    let mogelijkePlaatsen = openPlaatsen;

    // log(`Vind een plaats voor ${ondernemer.id}`);
    const ondernemerBranches = Ondernemer.getBranches(indeling, ondernemer);
    const voorkeuren = Ondernemer.getVoorkeuren(indeling, ondernemer);

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
            const adjacent = getAdjacentPlaatsenRecursive(indeling.rows, p.plaatsId, expansionSize, indeling.obstakels);

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
};

const assignUitbreiding = (indeling: IMarktindeling, toewijzing: IToewijzing): IMarktindeling => {
    const { ondernemer, plaatsen } = toewijzing;
    const { erkenningsNummer } = ondernemer;
    const targetSize = Ondernemer.getTargetSize(ondernemer);
    const currentSize = plaatsen.length;

    const removeFromQueue = (indeling: IMarktindeling, toewijzing: IToewijzing) => ({
        ...indeling,
        expansionQueue: (indeling.expansionQueue || []).filter(t => t !== toewijzing)
    });

    const replaceInQueue = (indeling: IMarktindeling, current: IToewijzing, replacement: IToewijzing) => ({
        ...indeling,
        expansionQueue: indeling.expansionQueue.map(item => (item === current ? replacement : item))
    });

    if (currentSize < targetSize) {
        const adjacent = getAdjacentPlaatsenForMultiple(indeling.rows, plaatsen, indeling.obstakels);
        const openAdjacent = intersection(adjacent, indeling.openPlaatsen);

        log(
            `Er zijn ${openAdjacent.length} open van de ${adjacent.length} aanliggende plaatsen voor ${plaatsen.join(
                ', '
            )}: ${openAdjacent.map(({ plaatsId }) => plaatsId).join(', ')}`
        );

        const uitbreidingPlaats = findOptimalSpot(ondernemer, openAdjacent, indeling);

        if (uitbreidingPlaats) {
            // Remove vrije plaats
            indeling = {
                ...indeling,
                openPlaatsen: indeling.openPlaatsen.filter(plaats => plaats.plaatsId !== uitbreidingPlaats.plaatsId)
            };

            const uitbreiding = {
                ...toewijzing,
                plaatsen: [...toewijzing.plaatsen, uitbreidingPlaats.plaatsId]
            };

            log(
                `Ondernemer ${ondernemer.erkenningsNummer} kan uitbreiden naar ${uitbreidingPlaats.plaatsId}`,
                toewijzing,
                uitbreiding
            );

            indeling = Toewijzing.replace(indeling, toewijzing, uitbreiding);

            if (currentSize + 1 < targetSize) {
                // Do You Want More?!!!??!
                indeling = replaceInQueue(indeling, toewijzing, uitbreiding);
            } else {
                indeling = removeFromQueue(indeling, toewijzing);
            }
            // TODO: Merge `toewijzing` and `uitbreiding` objects, add to `indeling`
        } else {
            log(
                `Geen uitbreiding van ${currentSize} naar ${currentSize +
                    1} plaatsen voor ondernemer ${erkenningsNummer}`
            );
            indeling = removeFromQueue(indeling, toewijzing);
        }
    }

    return indeling;
};

const calcDefaultVoorkeuren = (markt: IMarkt, ondernemers: IMarktondernemer[]): IPlaatsvoorkeur[] => {
    return ondernemers
    .map(({ plaatsen = [], erkenningsNummer }) => {
        return plaatsen.map((plaatsId: string): IPlaatsvoorkeur => ({
            erkenningsNummer,
            marktId: markt.marktId,
            plaatsId,
            priority: 0
        }));
    })
    .reduce(flatten, []);
};

const findPlaats = (
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
        const plaats = findOptimalSpot(ondernemer, mogelijkePlaatsen, indeling, maximum);
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
};

type MoveQueueItem = {
    toewijzing: IToewijzing;
    betereVoorkeuren: IPlaatsvoorkeur[];
    openPlaatsen: IMarktplaats[];
    beterePlaatsen: IMarktplaats[];
};

const getPossibleMoves = (state: IMarktindeling, toewijzing: IToewijzing): MoveQueueItem => {
    const { ondernemer } = toewijzing;
    const voorkeuren = Ondernemer.getVoorkeuren(state, ondernemer);

    const currentIndex = voorkeuren.findIndex(voorkeur => toewijzing.plaatsen.includes(voorkeur.plaatsId));
    const betereVoorkeuren = voorkeuren.slice(0, currentIndex === -1 ? voorkeuren.length : currentIndex);

    const beterePlaatsen = betereVoorkeuren
        .map(voorkeur => state.marktplaatsen.find(({ plaatsId }) => plaatsId === voorkeur.plaatsId))
        .filter(Boolean);

    const openPlaatsen = betereVoorkeuren
        .map(voorkeur => state.openPlaatsen.find(({ plaatsId }) => plaatsId === voorkeur.plaatsId))
        .filter(Boolean);

    return {
        toewijzing,
        betereVoorkeuren,
        beterePlaatsen,
        openPlaatsen
    };
};

export const calcToewijzingen = (markt: IMarkt & IMarktindelingSeed): IMarktindeling => {
    const { marktplaatsen, ondernemers, voorkeuren } = markt;
    const { aanwezigheid, aLijst } = markt;

    const aanwezigen = ondernemers.filter(ondernemer => Indeling.isAanwezig(aanwezigheid, ondernemer));
    aanwezigen.sort((a, b) => Ondernemers.compare(a, b, aLijst));

    log(
        `Aanwezigen: ${aanwezigen.length}/${ondernemers.length} (${(
            (aanwezigen.length / ondernemers.length) *
            100
        ).toFixed(1)}%)`
    );

    /*
     * De bij een herindeling gekozen marktplaats wordt verwerkt als de initiele voorkeur van de ondernemer.
     * Bij de dagindeling kan een andere voorkeur worden uitgesproken.
     */
    const aanwezigenVast = aanwezigen.filter((ondernemer) => Ondernemer.isVast(ondernemer));
    const defaultVoorkeuren = calcDefaultVoorkeuren(markt, aanwezigenVast);

    const initialState: IMarktindeling = {
        ...markt,
        toewijzingQueue: [...aanwezigen],
        expansionQueue: [],
        expansionIteration: 1,
        expansionLimit: Math.min(
            Number.isFinite(markt.expansionLimit) ? markt.expansionLimit : Infinity,
            markt.marktplaatsen.length
        ),
        afwijzingen: [],
        toewijzingen: [],
        openPlaatsen: [...marktplaatsen.filter(plaats => !plaats.inactive)],
        voorkeuren: [...defaultVoorkeuren, ...voorkeuren]
    };

    /*
     * stap 1:
     * vasteplaatshouders
     */
    const { toewijzingQueue } = initialState;
    const vplQueue = toewijzingQueue.filter(Ondernemer.heeftVastePlaatsen);
    let indeling: IMarktindeling = vplQueue.reduce(Indeling.assignVastePlaatsen, initialState);

    /*
     * stap 2:
     * beperkt de indeling tot kramen met een bepaalde verkoopinrichting
     */
    const brancheKramen = initialState.openPlaatsen.filter(plaats => count(plaats.branches) > 0);
    const brancheOndernemers = indeling.toewijzingQueue.filter(
        ondernemer => count(ondernemer.voorkeur && ondernemer.voorkeur.branches) > 0
    );

    log(`Branche-kramen: ${brancheKramen.length}`);
    log(`Branche-ondernemers: ${brancheOndernemers.length}`);

    indeling = brancheOndernemers.reduce((indeling, ondernemer, index, ondernemers) => {
        const ondernemerBranchePlaatsen = indeling.openPlaatsen.filter(plaats =>
            intersects(plaats.branches, ondernemer.voorkeur && ondernemer.voorkeur.branches)
        );
        log(
            `Branche-ondernemer ${ondernemer.erkenningsNummer} kan kiezen uit ${
                ondernemerBranchePlaatsen.length
            } plaatsen`
        );

        return findPlaats(indeling, ondernemer, ondernemerBranchePlaatsen, 'ignore');
    }, indeling);

    /*
     * stap 3:
     * beperkt de indeling tot kramen met een toewijzingsbeperking (branche, eigen materieel)
     * en ondernemers met een bijbehorende eigenschap
     */
    const verkoopinrichtingKramen = initialState.openPlaatsen.filter(plaats => count(plaats.verkoopinrichting) > 0);
    const verkoopinrichtingOndernemers = indeling.toewijzingQueue.filter(
        ondernemer => count(ondernemer.voorkeur && ondernemer.voorkeur.verkoopinrichting) > 0
    );

    log(`Verkoopinrichting-kramen: ${verkoopinrichtingKramen.length}`);
    log(`Verkoopinrichting-ondernemers: ${verkoopinrichtingOndernemers.length}`);

    indeling = verkoopinrichtingOndernemers.reduce((indeling, ondernemer, index, ondernemers) => {
        const ondernemerVerkoopinrichtingPlaatsen = indeling.openPlaatsen.filter(plaats =>
            intersects(plaats.verkoopinrichting, ondernemer.voorkeur ? ondernemer.voorkeur.verkoopinrichting : [])
        );
        log(
            `Bijzondere verkoopinrichting-ondernemer ${ondernemer.erkenningsNummer} kan kiezen uit ${
                ondernemerVerkoopinrichtingPlaatsen.length
            } plaatsen`
        );

        return findPlaats(indeling, ondernemer, ondernemerVerkoopinrichtingPlaatsen, 'ignore');
    }, indeling);

    // Deel sollicitanten in
    indeling = indeling.toewijzingQueue
        .filter(ondernemer => !Ondernemer.heeftVastePlaatsen(ondernemer)) // TODO: process entire queue, VPH too!
        .reduce((indeling, ondernemer) => findPlaats(indeling, ondernemer, indeling.openPlaatsen), indeling);

    const calculateMoveQueue = (state: IMarktindeling): MoveQueueItem[] =>
        state.toewijzingen
            .map(toewijzing => getPossibleMoves(state, toewijzing))
            .filter(obj => obj.betereVoorkeuren.length > 0)
            .sort((objA, objB) => Ondernemers.compare(objA.toewijzing.ondernemer, objB.toewijzing.ondernemer, aLijst))
            .map(obj => {
                const {
                    toewijzing: { ondernemer },
                    betereVoorkeuren,
                    openPlaatsen
                } = obj;

                log(
                    `Voor ondernemer ${ondernemer.erkenningsNummer} zijn er nog ${
                        betereVoorkeuren.length
                    } plaatsen die meer gewenst zijn (van de in totaal ${
                        voorkeuren.length
                    } voorkeuren: ${voorkeuren.map(({ plaatsId }) => plaatsId).join(', ')}), en daarvan zijn nog ${
                        openPlaatsen.length
                    } vrij: ${openPlaatsen.map(({ plaatsId }) => plaatsId).join(', ')}`
                );

                return obj;
            });

    const moveQueue = calculateMoveQueue(indeling);

    // Reducer in `processMoveQueue` below.
    const move = (state: IMarktindeling, obj: MoveQueueItem) =>
        findPlaats(
            state,
            obj.toewijzing.ondernemer,
            intersection(obj.beterePlaatsen, state.openPlaatsen),
            'ignore',
            obj.toewijzing.plaatsen.length
        );

    const processMoveQueue = (state: IMarktindeling, queue: MoveQueueItem[]): IMarktindeling => {
        let i = 0;
        const MOVE_LIMIT = 100;

        for (; queue.length > 0 && i < MOVE_LIMIT; i++) {
            log(`Move-queue #${i}: ${queue.length}`);

            const previousState = state;

            state = queue.reduce(move, state);

            if (previousState === state) {
                // Non-essential optimization: nothing changed, so this was the last iteration.
                // This could happen when someone wants to move to an open spot, but something is preventing the move.
                // In this case don't retry the same move until the `MOVE_LIMIT` is exhausted.
                break;
            }
            // TODO: the new `queue` should be created as copy or subset of the existing `queue`,
            // and when all options to move to a better spot have failed and the options are exhausted,
            // the person should not be included in the new queue.
            queue = calculateMoveQueue(state);
        }

        return state;
    };

    indeling = processMoveQueue(
        indeling,
        moveQueue.filter(({ toewijzing: { ondernemer } }) => ondernemer.status === 'vpl')
    );

    indeling = processMoveQueue(
        indeling,
        moveQueue.filter(({ toewijzing: { ondernemer } }) => ondernemer.status === 'vkk')
    );

    indeling = processMoveQueue(indeling, moveQueue);

    indeling = {
        ...indeling,
        expansionQueue: indeling.toewijzingen.filter(({ ondernemer }) => {
            return !!ondernemer.voorkeur &&
                   Ondernemer.getTargetSize(ondernemer) > indeling.expansionIteration;
        })
    };

    while (indeling.expansionIteration <= indeling.expansionLimit) {
        log(
            `Uitbreidingsronde naar ${indeling.expansionIteration} plaatsen (later tot maximaal ${
                indeling.expansionLimit
            }) voor ${indeling.expansionQueue.length} deelnemers`
        );

        // TODO: Remove items from expansion queue for which expansion was impossible,
        // skip those in the next iteration.

        indeling = indeling.expansionQueue
            .filter(toewijzing => {
                const { ondernemer, plaatsen } = toewijzing;
                const currentSize = plaatsen.length;
                const targetSize = Ondernemer.getTargetSize(ondernemer);

                return currentSize < Math.min(targetSize, indeling.expansionIteration, indeling.expansionLimit);
            })
            .map(toewijzing => {
                const { ondernemer, plaatsen } = toewijzing;
                const currentSize = plaatsen.length;
                const targetSize = Ondernemer.getTargetSize(ondernemer);

                log(
                    `Ondernemer ${
                        ondernemer.erkenningsNummer
                    } wil ${targetSize} plaatsen, en heeft nu ${currentSize} plaats(en)`,
                    toewijzing
                );

                return toewijzing;
            })
            .filter(toewijzing => {
                return !Ondernemer.isInMaxedOutBranche(indeling, toewijzing.ondernemer);
            })
            .reduce(assignUitbreiding, indeling);

        /*
        console.warn(
            `Na mogelijkheid tot uitbreiding ${indeling.expansionIteration} zijn er nog ${
                indeling.expansionQueue.map(({ ondernemer }) => ondernemer).reduce(unique, []).length
            } ondernemers die meer plaatsen willen`
        );
        */

        indeling = {
            ...indeling,
            expansionIteration: indeling.expansionIteration + 1
        };
    }

    log(indeling.toewijzingen.map(data => ({ ...data, ondernemer: undefined })));

    return indeling;
};
