import {
    IMarkt,
    IMarktindeling,
    IMarktindelingSeed
} from './markt.model';

import Indeling from './allocation/indeling';
import Ondernemer from './allocation/ondernemer';

/*
 * https://decentrale.regelgeving.overheid.nl/cvdr/XHTMLoutput/Actueel/Amsterdam/396119.html#id1-3-2-2-3-4-5
 */

export const calcToewijzingen = (markt: IMarkt & IMarktindelingSeed): IMarktindeling => {
    let indeling   = Indeling.init(markt);
    const calcSize = Indeling.createSizeFunction(indeling);

    // Deel ondernemers in
    // -------------------
    // - VPHs met meer dan 1 plaats krijgen deze toegewezen.
    // - VPHs met 1 plaats en sollicitanten krijgen maximaal 2 plaatsen (afhankelijk van hun
    //   voorkeuren, en de hoeveelheid beschikbare ruimte op de markt).
    //
    // Voor de prioritering van indelen, zie `Indeling._compareOndernemers` die in
    // `Indeling.init` wordt gebruikt om alle aanwezige ondernemers te sorteren.
    indeling = indeling.toewijzingQueue
    .reduce((indeling, ondernemer) => {
        return Indeling.assignPlaatsen(indeling, ondernemer, calcSize);
    }, indeling);

    // Voer uitbreidingen uit
    // ----------------------
    // Dit gaat in iteraties: iedereen die een 3de plaats wil krijgt deze aangeboden alvorens
    // iedereen die een 4de plaats wil hiertoe de kans krijgt.
    indeling = Indeling.performExpansion(indeling);

    // Probeer afwijzingen opnieuw
    // ---------------------------
    // Soms komen er plaatsen vrij omdat iemands `minimum` niet verzadigd is. Probeer
    // eerder afgewezen sollictanten opnieuw in te delen omdat deze mogelijk passen op
    // de vrijgekomen plaatsen.
    indeling = indeling.afwijzingen
    .reduce((indeling, afwijzing) => {
        const { ondernemer } = afwijzing;
        return !Ondernemer.isVast(ondernemer) ?
               Indeling.assignPlaatsen(indeling, ondernemer) :
               indeling;
    }, indeling);
    indeling = Indeling.performExpansion(indeling);

    return indeling;
};
