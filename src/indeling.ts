import {
    IMarkt,
    IMarktindeling,
    IMarktindelingSeed,
    IToewijzing,
} from './markt.model';

import {
    count,
    flatten,
    intersection,
    intersects,
    log,
} from './util';

import Markt from './allocation/markt';
import Indeling from './allocation/indeling';
import Ondernemers from './allocation/ondernemers';
import Ondernemer from './allocation/ondernemer';
import Toewijzing from './allocation/toewijzing';
import Moving from './allocation/moving';

/*
 * https://decentrale.regelgeving.overheid.nl/cvdr/XHTMLoutput/Actueel/Amsterdam/396119.html#id1-3-2-2-3-4-5
 */

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
        const adjacent = Markt.getAdjacentPlaatsenForMultiple(indeling.rows, plaatsen, indeling.obstakels);
        const openAdjacent = intersection(adjacent, indeling.openPlaatsen);

        log(
            `Er zijn ${openAdjacent.length} open van de ${adjacent.length} aanliggende plaatsen voor ${plaatsen.join(
                ', '
            )}: ${openAdjacent.map(({ plaatsId }) => plaatsId).join(', ')}`
        );

        const uitbreidingPlaats = Indeling.findBestePlaats(ondernemer, openAdjacent, indeling);

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
    const defaultVoorkeuren = aanwezigenVast
                              .map(ondernemer => Ondernemer.getDefaultVoorkeurPlaatsen(markt, ondernemer))
                              .reduce(flatten, []);

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

        return Indeling.findPlaats(indeling, ondernemer, ondernemerBranchePlaatsen, 'ignore');
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

        return Indeling.findPlaats(indeling, ondernemer, ondernemerVerkoopinrichtingPlaatsen, 'ignore');
    }, indeling);

    /*
     * Stap 4:
     * Deel sollicitanten in
     */
    indeling = indeling.toewijzingQueue
        .filter(ondernemer => !Ondernemer.heeftVastePlaatsen(ondernemer)) // TODO: process entire queue, VPH too!
        .reduce((indeling, ondernemer) => Indeling.findPlaats(indeling, ondernemer, indeling.openPlaatsen), indeling);

    /*
     * Stap 5: Verwerk verplaatsingsvoorkeuren
     */
    const moveQueue = Moving.generateQueue(indeling, aLijst);
    indeling = Moving.processQueue(
        indeling,
        aLijst,
        moveQueue.filter(({ toewijzing: { ondernemer } }) => Ondernemer.isVast(ondernemer))
    );
    indeling = Moving.processQueue(indeling, aLijst, moveQueue);
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
