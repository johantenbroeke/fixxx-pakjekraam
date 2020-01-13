import {
    BrancheId,
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
    compareProperty,
    intersection,
    intersects,
    sum
} from '../util';

import Markt from './markt';
import Ondernemer from './ondernemer';
import Ondernemers from './ondernemers';
import Toewijzing from './toewijzing';

// Wordt gebruikt in `_findBestePlaatsen` om `IMarktplaats` object om te vormen
// tot `IPlaatsvoorkeur` objecten met een berekend `brancheIntersectCount` getal.
//
// Hierdoor kunnen `priority` en `brancheIntersectCount` gebruikt worden om in
// `_findBestGroup` de meest geschikte set plaatsen te vinden.
interface IPlaatsvoorkeurPlus extends IPlaatsvoorkeur {
    brancheScore: number;
    eviScore: number;
    voorkeurScore: number;
}

export const BRANCHE_FULL: IAfwijzingReason = {
    code: 1,
    message: 'Alle marktplaatsen voor deze branch zijn reeds ingedeeld.'
};
export const ADJACENT_UNAVAILABLE: IAfwijzingReason = {
    code: 2,
    message: 'Geen geschikte plaats(en) gevonden.'
};
export const MINIMUM_UNAVAILABLE: IAfwijzingReason = {
    code: 3,
    message: 'Minimum aantal plaatsen niet beschikbaar.'
};

const Indeling = {
    init: (markt: IMarkt & IMarktindelingSeed): IMarktindeling => {
        const marktDate = new Date(markt.marktDate);
        if (!+marktDate) {
            throw Error('Invalid market date');
        }

        const openPlaatsen   = markt.marktplaatsen.filter(plaats => !plaats.inactive);
        const expansionLimit = Number.isFinite(markt.expansionLimit) ?
                               markt.expansionLimit :
                               markt.marktplaatsen.length;

        const indeling = <IMarktindeling> {
            ...markt,
            openPlaatsen,
            expansionLimit,

            voorkeuren      : [...markt.voorkeuren],
            afwijzingen     : [],
            toewijzingen    : []
        };

        // We willen enkel de aanwezige ondernemers, gesorteerd op prioriteit. Daarnaast
        // staan ondernemers soms dubbel in de lijst (miscommunicatie tussen Mercato en
        // Makkelijke Markt), dus dubbelingen moeten eruit gefilterd worden.
        //
        // De sortering die hier plaatsvindt is van groot belang voor alle hierop
        // volgende code.
        indeling.ondernemers = markt.ondernemers
        .reduce((result, ondernemer) => {
            if (
                Indeling.isAanwezig(ondernemer, markt.aanwezigheid, marktDate) &&
                result.find(({ erkenningsNummer, sollicitatieNummer }) =>
                    erkenningsNummer === ondernemer.erkenningsNummer ||
                    sollicitatieNummer === ondernemer.sollicitatieNummer
                ) === undefined
            ) {
                result.push(ondernemer);
            }

            return result;
        }, [])
        .sort((a, b) => Indeling._compareOndernemers(indeling, a, b));

        // TODO: Verwijder voorkeuren uit `indeling.voorkeuren` van ondernemers die niet in
        //       `indeling.ondernemers` zitten.

        return indeling;
    },

    allocateOndernemer: (
        indeling: IMarktindeling,
        queue: IMarktondernemer[],
        ondernemer: IMarktondernemer,
        openPlaatsen: IMarktplaats[] = indeling.openPlaatsen
    ): IMarktindeling => {
        try {
            if (
                !Ondernemer.isVast(ondernemer) &&
                Ondernemer.isInMaxedOutBranche(indeling, ondernemer)
            ) {
                throw BRANCHE_FULL;
            }

            const anywhere      = Ondernemer.acceptsRandomAllocation(ondernemer);
            const size          = Indeling._calculateStartSizeFor(indeling, queue, ondernemer);
            const bestePlaatsen = Indeling._findBestePlaatsen(
                indeling, ondernemer, openPlaatsen, size, anywhere
            );

            if (!bestePlaatsen.length) {
                throw ADJACENT_UNAVAILABLE;
            }

            // Deel deze ondernemer op hun meest gewilde locatie in. De resulterende
            // indeling slaan we in een andere variabele op, zodat we hem nog ongedaan
            // kunnen maken als de toewijzing een probleem oplevert. Zie hieronder.
            const _indeling = bestePlaatsen.reduce((result, plaats) => {
                return Toewijzing.add(result, ondernemer, plaats);
            }, indeling);

            const statusGroup = Indeling.getStatusGroup(indeling, ondernemer);
            if (statusGroup !== 3) {
                return _indeling;
            }

            // Dit is een VPH die wil verplaatsen. Kijk of de huidige toewijzing geen
            // situatie oplevert waarbij een andere verplaatsende VPH wordt afgewezen:
            // een scenario dat niet mag optreden.
            //
            // Check of deze ondernemer nu op vaste plaatsen van een andere VPH  staat.
            // Is dit niet het geval, dan is er niks aan de hand.
            const affectedVPH = bestePlaatsen
                                .map(plaats => Ondernemers.findVPHFor(_indeling, plaats.plaatsId))
                                .filter(vph => vph && vph.sollicitatieNummer !== ondernemer.sollicitatieNummer);

            if (!affectedVPH.length) {
                return _indeling;
            }

            // Deze ondernemer neemt een of meerdere plaatsen in van andere VPHs. We
            // simuleren nu de verdere indeling van de VPHs om te zien of de relevante
            // VPHs nu worden afgewezen. Als dit het geval is, dan is de huidige toewijzing
            // niet geschikt.
            //
            // Deze simulatie slaan we weer in een andere variabele op. Het kan namelijk zijn
            // dat er in deze simulatie VPHs succesvol worden toegewezen. Zouden we `_indeling`
            // gebruiken en zijn er geen problemen, dan wordt er verder gerekend met deze
            // indeling. Het resultaat is vervolgens dat er VPHs voor hun beurt zijn ingedeeld.
            //
            // Enkel de huidige ondernemer mag in deze run ingedeeld worden. In
            // `Indeling.performAllocation` wordt de juiste volgorde van indeling bepaald.
            //
            // TODO: `Indeling.performAllocation` hoeft in dit geval enkel `statusGroup === 3`
            //       door te rekenen. Deze optimalisatie toevoegen?
            const _indeling2 = Indeling.performAllocation(_indeling, queue.slice(1));
            const rejections = affectedVPH.reduce((result, ondernemer) => {
                const rejection = Indeling._findRejection(_indeling2, ondernemer);
                return rejection ? result.concat(rejection) : result;
            }, []);

            if (!rejections.length) {
                return _indeling;
            }

            // De huidige toewijzing levert afgewezen VPHs op. We maken de toewijzing ongedaan
            // door de oorspronkelijke indeling weer te gebruiken (die van voor de toewijzing).
            // Vervolgens maken we de plaatsen uit de huidige toewijzing ontoegankelijk (m.u.v.
            // hun eigen plaatsen als die er tussen zitten), en proberen de ondernemer opnieuw
            // in te delen. Worst case scenario hier is dat deze ondernemer uiteindelijk op
            // zijn eigen plaatsen terecht komt.
            const offending = bestePlaatsen
                              .filter(plaats => !Ondernemer.hasVastePlaats(ondernemer, plaats))
                              .map(plaats => plaats.plaatsId);
            openPlaatsen = openPlaatsen.filter(plaats => !offending.includes(plaats.plaatsId));
            return Indeling.allocateOndernemer(indeling, queue, ondernemer, openPlaatsen);
        } catch (errorMessage) {
            return Indeling._rejectOndernemer(indeling, ondernemer, errorMessage);
        }
    },

    // `anywhere` wordt als argument meegegeven i.p.v. uit de ondernemers-
    // voorkeuren gehaald, omdat deze functie ook gebruikt wordt in
    // `_findBestGroup` om een set voorkeuren uit te breiden naar het
    // gewenste aantal plaatsen. Voor deze uitbreiding staat `anywhere` altijd
    // op true omdat de gewenste plaatsen al bemachtigd zijn, maar het er nog niet
    // genoeg zijn om de minimum wens te verzadigen.
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

        return Indeling._isAvailable(indeling, plaats, ondernemer) && (
            // Als de plaats is toegekend zijn verdere controles onnodig.
            Ondernemer.hasVastePlaats(ondernemer, plaats) || !(
                // Ondernemer is in verplichte branche, maar plaats voldoet daar niet aan.
                verplichteBrancheIds.length && !intersects(verplichteBrancheIds, plaats.branches) ||
                // Ondernemer heeft een EVI, maar de plaats is hier niet geschikt voor.
                Ondernemer.hasEVI(ondernemer) && !Markt.hasEVI(plaats) ||
                // Ondernemer wil niet willekeurig ingedeeld worden en plaats is geen voorkeur.
                !anywhere && !voorkeurIds.includes(plaats.plaatsId)
            )
        );
    },

    // Bepaalt samen met `_compareOndernemers` de volgorde van indeling:
    // 0. VPHs die niet willen verplaatsen.
    // 1. Ondernemers die willen bakken (kan ook een VPH zijn die wil verplaatsen).
    // 2. Ondernemers met een EVI (kan ook een VPH zijn die wil verplaatsen).
    // 3. VPHs die willen/moeten verplaatsen.
    // 4. Sollicitanten.
    getStatusGroup: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer
    ): number => {
        return Ondernemer.hasVastePlaatsen(ondernemer) &&
               !Indeling.willMove(indeling, ondernemer)   ? 0 :
               Ondernemer.hasBranche(ondernemer, 'bak')   ? 1 :
               Ondernemer.hasEVI(ondernemer)              ? 2 :
               Ondernemer.hasVastePlaatsen(ondernemer)    ? 3 :
                                                            4;
    },

    // Wordt in `_compareOndernemers` als tweede sorteercriterium gebruikt.
    getListGroup: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer
    ): number => {
        return Ondernemer.hasVastePlaatsen(ondernemer) ? 1 :
               indeling.aLijst.includes(ondernemer)    ? 1 :
                                                         2;
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

    performCalculation: (
        indeling: IMarktindeling,
        queue: IMarktondernemer[]
    ): IMarktindeling => {
        indeling = Indeling.performAllocation(indeling, queue);
        indeling = Indeling.performExpansion(indeling);

        // Soms komen er plaatsen vrij omdat iemands `minimum` niet verzadigd is. Probeer
        // eerder afgewezen sollicitanten opnieuw in te delen omdat deze mogelijk passen op
        // de vrijgekomen plaatsen.
        const rejectedQueue = indeling.afwijzingen.map(({ ondernemer }) => ondernemer);
        indeling = Indeling.performAllocation(indeling, rejectedQueue);
        indeling = Indeling.performExpansion(indeling);

        return indeling;
    },

    // - VPHs met meer dan 1 plaats krijgen deze toegewezen.
    // - VPHs met 1 plaats en sollicitanten krijgen maximaal 2 plaatsen (afhankelijk van hun
    //   voorkeuren, en de hoeveelheid beschikbare ruimte op de markt).
    //
    // Voor de prioritering van indelen, zie `Indeling._compareOndernemers` die in
    // `Indeling.init` wordt gebruikt om alle aanwezige ondernemers te sorteren.
    performAllocation: (
        indeling: IMarktindeling,
        queue: IMarktondernemer[]
    ): IMarktindeling => {
        return queue.reduce((indeling, ondernemer, i) => {
            const queueRemaining = queue.slice(i);

            return Indeling.allocateOndernemer(indeling, queueRemaining, ondernemer);
        }, indeling);
    },

    // Uitbreiden gaat in iteraties: iedereen die een 3de plaats wil krijgt deze
    // aangeboden alvorens iedereen die een 4de plaats wil hiertoe de kans krijgt.
    performExpansion: (
        indeling: IMarktindeling,
        brancheId: BrancheId = undefined,
        iteration: number = 2
    ): IMarktindeling => {
        const queue = indeling.toewijzingen.filter(toewijzing =>
            Ondernemer.wantsExpansion(toewijzing) && (
                !brancheId ||
                (brancheId === 'evi' && Ondernemer.hasEVI(toewijzing.ondernemer)) ||
                Ondernemer.hasBranche(toewijzing.ondernemer, brancheId)
            )
        );

        indeling = queue.reduce((indeling, toewijzing) => {
            const { ondernemer } = toewijzing;

            const openAdjacent = Markt.getAdjacentPlaatsen(indeling, toewijzing.plaatsen, 1);
            const [uitbreidingPlaats] = Indeling._findBestePlaatsen(indeling, ondernemer, openAdjacent, 1, true);

            // Nog voordat we controleren of deze ondernemer in deze iteratie eigenlijk wel kan
            // uitbreiden (zie `canExpandInIteration` in de `else`) bekijken we of er wel een
            // geschikte plaats is. Is dit niet het geval, en heeft de ondernemer een `minimum`,
            // dan kunnen we ze al afwijzen nog voordat ze überhaupt aan de beurt zijn. Dit levert
            // ruimte op voor andere ondernemers.
            if (!uitbreidingPlaats) {
                const { plaatsen } = Toewijzing.find(indeling, ondernemer);
                const { minimum = 0 } = ondernemer.voorkeur || {};

                return minimum > plaatsen.length ?
                       Indeling._rejectOndernemer(indeling, ondernemer, MINIMUM_UNAVAILABLE) :
                       indeling;
            } else {
                return Ondernemer.canExpandInIteration(indeling, iteration, toewijzing) ?
                       Toewijzing.add(indeling, ondernemer, uitbreidingPlaats) :
                       indeling;
            }
        }, indeling);

        return queue.length && iteration < indeling.expansionLimit ?
               Indeling.performExpansion(indeling, brancheId, ++iteration) :
               indeling;
    },

    // Als een VPH voorkeuren heeft opgegeven, dan geven zij daarmee aan dat ze
    // willen verplaatsen. We beschouwen een VPH eveneens als een verplaatser
    // als niet al hun vaste plaatsen beschikbaar zijn.
    willMove: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer
    ): boolean => {
        const vastePlaatsen = Ondernemer.getVastePlaatsen(indeling, ondernemer);
        const beschikbaar = vastePlaatsen.filter(plaats => Indeling._isAvailable(indeling, plaats, ondernemer));
        const voorkeuren = Ondernemer.getPlaatsVoorkeuren(indeling, ondernemer, false);

        return beschikbaar.length < vastePlaatsen.length || !!voorkeuren.length;
    },

    _calculateStartSizeFor: (
        indeling: IMarktindeling,
        queue: IMarktondernemer[],
        ondernemer: IMarktondernemer
    ): number => {
        const totalSpots  = indeling.openPlaatsen.length;
        const minRequired = queue.reduce((sum, ondernemer) => {
            return sum + Ondernemer.getStartSize(ondernemer);
        }, 0);

        const startSize  = Ondernemer.getStartSize(ondernemer);
        const targetSize = Ondernemer.getTargetSize(ondernemer);
        const happySize  = startSize === 1 ? Math.min(targetSize, 2) : startSize;

        return totalSpots > minRequired ? happySize :
               totalSpots > 0           ? startSize :
                                          0;
    },

    _findBestGroup: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer,
        groups: IPlaatsvoorkeur[][],
        size: number = 1,
        compare?: (best: IPlaatsvoorkeur[], current: IPlaatsvoorkeur[]) => number
    ): IMarktplaats[] => {
        const minSize = Math.min(size, Ondernemer.getMinimumSize(ondernemer));

        return groups.reduce((result, group) => {
            if (group.length < size) {
                const depth     = size - group.length;
                const plaatsIds = group.map(({ plaatsId }) => plaatsId);
                const extra     = Markt.getAdjacentPlaatsen(indeling, plaatsIds, depth, plaats =>
                    Indeling.canBeAssignedTo(indeling, ondernemer, plaats, true)
                );
                group = group.concat(<IPlaatsvoorkeur[]> extra);
                // Zet de zojuist toegevoegde plaatsen op de juiste plek.
                group = Markt.groupByAdjacent(indeling, group)[0];
            }

            if (
                group.length >= minSize &&
                // Zolang we het maximaal aantal gewenste plaatsen nog niet hebben bereikt
                // blijven we doorzoeken.
                Math.min(size, group.length) > result.length
            ) {
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
        const ondernemerEVI        = Ondernemer.hasEVI(ondernemer);

        // 1. Converteer geschikte plaatsen naar IPlaatsvoorkeur (zodat elke optie
        //    een `priority` heeft).
        // 2. Sorteer op branche overlap en `priority`.
        const plaatsen = <IPlaatsvoorkeurPlus[]> openPlaatsen
        .map(plaats => {
            const voorkeur = voorkeuren.find(({ plaatsId }) => plaatsId === plaats.plaatsId);
            // De vaste plaatsen hebben geen prioriteit, maar moeten wel boven gewone plaatsen
            // komen in de sortering. Een priority -1 verstoort de sortering, dus doen we `+1`
            // voor alle voorkeursplaatsen, maken we de vaste plaatsen `1`, en krijgen gewone
            // plaatsen priority `0`.
            const priority = voorkeur ? voorkeur.priority+1 || 1 : 0;
            const branches = plaats.branches || [];
            // De branche score vertegenwoordigd een ranking in manier van overlap in
            // ondernemers branches vs. plaats branches:
            // 0. Geen overlap, maar plaats heeft wel branches
            // 1. Geen overlap
            // 2. Gedeeltelijke overlap:          ondernemer['x']      vs plaats['x', 'y']
            // 3. Gedeeltelijk de andere kant op: ondernemer['x', 'y'] vs plaats['x']
            // 4. Volledige overlap:              ondernemer['x', 'y'] vs plaats['x', 'y']
            const plaatsBrancheCount     = branches.length;
            const ondernemerBrancheCount = ondernemerBrancheIds.length;
            const intersectCount         = intersection(branches, ondernemerBrancheIds).length;
            const brancheScore           = !intersectCount && plaatsBrancheCount       ? 0 :
                                           !intersectCount                             ? 1 :
                                           intersectCount < plaatsBrancheCount         ? 2 :
                                           ondernemerBrancheCount > plaatsBrancheCount ? 3 :
                                                                                         4;

            const plaatsEVI = Markt.hasEVI(plaats);
            const eviScore = Number(ondernemerEVI) - Number(plaatsEVI) !== 0 ? 0 : 1;

            // De voorkeurscore betekent: hoe meer ondernemers deze plaats als voorkeur hebben
            // opgegeven, hoe hoger de score. Dit getal wordt gebruikt voor ondernemers die flexibel
            // ingedeeld willen worden. We proberen deze ondernemers op een plaats te zetten waar
            // geen of zo min mogelijk ondernemers een voorkeur voor hebben uitgesproken.
            const voorkeurScore = Ondernemers.countPlaatsVoorkeurenFor(indeling, plaats.plaatsId);

            return {
                ...plaats,
                priority,
                brancheScore,
                eviScore,
                voorkeurScore
            };
        })
        .sort((a, b) =>
            b.brancheScore - a.brancheScore ||
            b.eviScore - a.eviScore ||
            b.priority - a.priority ||
            a.voorkeurScore - b.voorkeurScore
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
            (a: IPlaatsvoorkeurPlus[], b: IPlaatsvoorkeurPlus[]) =>
                compareProperty(b, a, 'brancheScore') ||
                compareProperty(b, a, 'eviScore') ||
                compareProperty(b, a, 'priority') ||
                compareProperty(a, b, 'voorkeurScore')
        );
    },

    _findRejection: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer
    ) => {
        return indeling.afwijzingen.find(({ erkenningsNummer }) =>
            erkenningsNummer === ondernemer.erkenningsNummer
        );
    },

    _isAvailable: (
        indeling: IMarktindeling,
        targetPlaats: IMarktplaats,
        ondernemer: IMarktondernemer
    ): boolean => {
        return !!~indeling.openPlaatsen.findIndex(({ plaatsId }) => {
            if (plaatsId !== targetPlaats.plaatsId) {
                return false;
            }

            // Deze code behandeld een specifieke situatie. Het kan voorkomen dat 2 VPHs
            // beiden willen verplaatsen, waarbij de VPH met hogere anciënniteit een plek
            // van de andere VPH inneemt. In sommige gevallen is dit onterecht: als de latere
            // VPH meerdere plaatsen heeft kan het zijn dat hij ondanks zijn voorkeuren bepaalde
            // van zijn vaste plaatsen nooit zal verlaten. Die plekken mogen niet beschikbaar
            // zijn komen voor andere VPHs.
            //
            // Zie ook `Ondernemer.willNeverLeave`.
            const plaatsEigenaar = Ondernemers.findVPHFor(indeling, plaatsId);
            return !plaatsEigenaar ||
                   ondernemer === plaatsEigenaar ||
                   !Ondernemer.willNeverLeave(indeling, plaatsEigenaar).includes(plaatsId);
        });
    },

    _rejectOndernemer: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer,
        reason: IAfwijzingReason
    ): IMarktindeling => {
        indeling = Toewijzing.remove(indeling, ondernemer);

        if( !Indeling._findRejection(indeling, ondernemer) ) {
            indeling.afwijzingen = indeling.afwijzingen.concat({
                marktId          : indeling.marktId,
                marktDate        : indeling.marktDate,
                erkenningsNummer : ondernemer.erkenningsNummer,
                reason,
                ondernemer
            });
        }

        return indeling;
    },

    _compareOndernemers: (
        indeling: IMarktindeling,
        a: IMarktondernemer,
        b: IMarktondernemer
    ): number => {
        // Sorteer eerst op status groep...
        const sort1 = Indeling.getStatusGroup(indeling, a) -
                      Indeling.getStatusGroup(indeling, b);
        // ... dan op anciënniteitsnummer.
        const sort2 = a.sollicitatieNummer - b.sollicitatieNummer;

        return sort1 || sort2;
    }
};

export default Indeling;
