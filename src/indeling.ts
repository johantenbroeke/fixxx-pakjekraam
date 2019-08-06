import {
    IMarkt,
    IMarktindeling,
    IMarktindelingSeed
} from './markt.model';

import {
    count,
    flatten,
    intersects,
} from './util';

import Indeling from './allocation/indeling';
import Ondernemers from './allocation/ondernemers';
import Ondernemer from './allocation/ondernemer';
import Moving from './allocation/moving';

/*
 * https://decentrale.regelgeving.overheid.nl/cvdr/XHTMLoutput/Actueel/Amsterdam/396119.html#id1-3-2-2-3-4-5
 */

export const calcToewijzingen = (markt: IMarkt & IMarktindelingSeed): IMarktindeling => {
    const { marktplaatsen, ondernemers, voorkeuren } = markt;
    const { aanwezigheid, aLijst } = markt;

    const aanwezigen = ondernemers.filter(ondernemer => Indeling.isAanwezig(aanwezigheid, ondernemer));
    aanwezigen.sort((a, b) => Ondernemers.compare(a, b, aLijst));

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
     * Stap 1:
     * Deel vasteplaatshouders in
     */
    const { toewijzingQueue } = initialState;
    const vplQueue = toewijzingQueue.filter(Ondernemer.heeftVastePlaatsen);
    let indeling: IMarktindeling = vplQueue.reduce(Indeling.assignVastePlaatsen, initialState);

    /*
     * Stap 2:
     * Verwerk verplaatsingen voor VPH
     */
    const vasteToewijzingen = indeling.toewijzingen.filter(({ ondernemer }) => Ondernemer.isVast);
    const queueVast = Moving.generateQueue(indeling, aLijst, vasteToewijzingen);
    indeling = Moving.processQueue(indeling, aLijst, queueVast);

    /*
     * Stap 3:
     * beperkt de indeling tot kramen met een bepaalde verkoopinrichting
     */
    // const brancheKramen = initialState.openPlaatsen.filter(plaats => count(plaats.branches) > 0);
    const brancheOndernemers = indeling.toewijzingQueue.filter(ondernemer => Ondernemer.isInBranche(indeling, ondernemer));
    indeling = brancheOndernemers.reduce((indeling, ondernemer, index, ondernemers) => {
        const ondernemerBranchePlaatsen = indeling.openPlaatsen.filter(plaats =>
            intersects(plaats.branches, ondernemer.voorkeur && ondernemer.voorkeur.branches)
        );

        return Indeling.findPlaats(indeling, ondernemer, ondernemerBranchePlaatsen, 'ignore');
    }, indeling);

    /*
     * Stap 4:
     * beperkt de indeling tot kramen met een toewijzingsbeperking (branche, eigen materieel)
     * en ondernemers met een bijbehorende eigenschap
     */
    // const verkoopinrichtingKramen = initialState.openPlaatsen.filter(plaats => count(plaats.verkoopinrichting) > 0);
    const verkoopinrichtingOndernemers = indeling.toewijzingQueue.filter(
        ondernemer => count(ondernemer.voorkeur && ondernemer.voorkeur.verkoopinrichting) > 0
    );

    indeling = verkoopinrichtingOndernemers.reduce((indeling, ondernemer, index, ondernemers) => {
        const ondernemerVerkoopinrichtingPlaatsen = indeling.openPlaatsen.filter(plaats =>
            intersects(plaats.verkoopinrichting, ondernemer.voorkeur ? ondernemer.voorkeur.verkoopinrichting : [])
        );

        return Indeling.findPlaats(indeling, ondernemer, ondernemerVerkoopinrichtingPlaatsen, 'ignore');
    }, indeling);

    /*
     * Stap 5:
     * Deel sollicitanten in
     */
    indeling = indeling.toewijzingQueue
    .filter(ondernemer => !Ondernemer.heeftVastePlaatsen(ondernemer)) // TODO: process entire queue, VPH too!
    .reduce((indeling, ondernemer) => Indeling.findPlaats(indeling, ondernemer, indeling.openPlaatsen), indeling);

    /*
     * Stap 6: Verwerk verplaatsingsvoorkeuren voor niet-VPH.
     */
    const queueRest = Moving.generateQueue(indeling, aLijst);
    indeling = Moving.processQueue(indeling, aLijst, queueRest);

    /*
     * Stap 7: Verwerk uitbreidingsvoorkeuren
     */
    indeling = Indeling.generateExpansionQueue(indeling);
    indeling = Indeling.processExpansionQueue(indeling);

    return indeling;
};
