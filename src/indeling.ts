import {
    IMarkt,
    IMarktindeling,
    IMarktindelingSeed
} from './markt.model';

import {
    intersects
} from './util';

import Markt from './allocation/markt';
import Indeling from './allocation/indeling';
import Ondernemer from './allocation/ondernemer';

/*
 * https://decentrale.regelgeving.overheid.nl/cvdr/XHTMLoutput/Actueel/Amsterdam/396119.html#id1-3-2-2-3-4-5
 */

export const calcToewijzingen = (markt: IMarkt & IMarktindelingSeed): IMarktindeling => {
    let indeling = Indeling.init(markt);

    // Stap 1: Deel VPHs in
    // ---------------------
    indeling = indeling.toewijzingQueue
    .filter(ondernemer => {
        return Ondernemer.heeftVastePlaatsen(ondernemer) &&
              !Ondernemer.wantsToMove(indeling, ondernemer) &&
              !Indeling.hasToMove(indeling, ondernemer);
    })
    .reduce((indeling, ondernemer) => {
        return Indeling.assignVastePlaatsen(indeling, ondernemer);
    }, indeling);

    // Stap 2: Deel ondernemers in die willen bakken
    // ---------------------------------------------
    const bakOndernemers = indeling.toewijzingQueue.filter(ondernemer =>
        Ondernemer.heeftBranche(ondernemer, 'bak')
    );
    const bakPlaatsen = indeling.openPlaatsen.filter(plaats =>
        Markt.heeftBranche(plaats, 'bak')
    );
    const bakStrategy = Indeling.determineStrategy(bakOndernemers, bakPlaatsen);

    indeling = bakOndernemers.reduce((indeling, ondernemer) =>
        Indeling.assignPlaats(indeling, ondernemer, indeling.openPlaatsen, 'reject', undefined, bakStrategy)
    , indeling);

    // Stap 3: Deel ondernemers met een verkoopinrichting in
    // -----------------------------------------------------
    const eviOndernemers = indeling.toewijzingQueue.filter(Ondernemer.heeftEVI);
    const eviPlaatsen = indeling.openPlaatsen.filter(Markt.heeftEVI);
    const eviStrategy = Indeling.determineStrategy(eviOndernemers, eviPlaatsen);

    indeling = eviOndernemers.reduce((indeling, ondernemer) =>
        Indeling.assignPlaats(indeling, ondernemer, indeling.openPlaatsen, 'reject', undefined, eviStrategy)
    , indeling);

    // Stap 4: Deel VPHs in die willen verplaatsen
    // --------------------------------------------
    indeling = indeling.toewijzingQueue
    .filter(Ondernemer.heeftVastePlaatsen)
    .reduce((indeling, ondernemer) => {
        return Indeling.assignVastePlaatsen(indeling, ondernemer);
    }, indeling);

    // Stap 5: Deel branche ondernemers in
    // -----------------------------------
    indeling = indeling.toewijzingQueue
    .filter(ondernemer => Ondernemer.heeftBranche(ondernemer))
    .reduce((indeling, ondernemer) => {
        const { branches = [] } = ondernemer.voorkeur || {};
        const plaatsen = indeling.openPlaatsen.filter(plaats =>
            intersects(plaats.branches, branches)
        );

        return Indeling.assignPlaats(indeling, ondernemer, plaatsen, 'ignore');
    }, indeling);

    // Stap 6: Deel sollicitanten in
    // -----------------------------
    indeling = indeling.toewijzingQueue
    .reduce((indeling, ondernemer) => {
        return Indeling.assignPlaats(indeling, ondernemer, indeling.openPlaatsen);
    }, indeling);

    // Stap 7: Verwerk uitbreidingsvoorkeuren
    // --------------------------------------
    indeling = Indeling.performExpansion(indeling);

    // Stap 8: Probeer afwijzingen opnieuw
    // -----------------------------------
    // Soms komen er plaatsen vrij omdat iemands `minimum` niet verzadigd is. Probeer
    // eerder afgewezen sollictanten opnieuw in te delen omdat deze mogelijk passen op
    // de vrijgekomen plaatsen.
    indeling = indeling.afwijzingen
    .reduce((indeling, afwijzing) => {
        const { ondernemer } = afwijzing;
        return !Ondernemer.isVast(ondernemer) ?
               Indeling.assignPlaats(indeling, ondernemer, indeling.openPlaatsen) :
               indeling;
    }, indeling);

    indeling = Indeling.performExpansion(indeling);

    return indeling;
};
