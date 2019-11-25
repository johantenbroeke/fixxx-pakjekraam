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
    intersection,
    intersects,
    sum
} from '../util';

import Markt from './markt';
import Ondernemer from './ondernemer';
import Ondernemers from './ondernemers';
import Toewijzing from './toewijzing';

type SizeMap = Map<IMarktondernemer, number>;

// Wordt gebruikt in `_findBestePlaatsen` om `IMarktplaats` object om te vormen
// tot `IPlaatsvoorkeur` objecten met een berekend `brancheIntersectCount` getal.
//
// Hierdoor kunnen `priority` en `brancheIntersectCount` gebruikt worden om in
// `_findBestGroup` de meest geschikte set plaatsen te vinden.
interface IPlaatsvoorkeurPlus extends IPlaatsvoorkeur {
    brancheScore: number;
    voorkeurScore: number;
}

export const BRANCHE_FULL: IAfwijzingReason = {
    code: 1,
    message: 'Alle marktplaatsen voor deze branch zijn reeds ingedeeld'
};
export const ADJACENT_UNAVAILABLE: IAfwijzingReason = {
    code: 2,
    message: 'Geen geschikte plaats(en) gevonden'
};
export const MINIMUM_UNAVAILABLE: IAfwijzingReason = {
    code: 3,
    message: 'Minimum aantal plaatsen niet beschikbaar'
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

            toewijzingQueue : undefined,
            afwijzingen     : [],
            toewijzingen    : [],
            voorkeuren      : [...markt.voorkeuren]
        };

        // We willen enkel de aanwezige ondernemers, gesorteerd op prioriteit. Daarnaast
        // staan ondernemers soms dubbel in de lijst (miscommunicatie tussen Mercato en
        // MakkelijkeMarkt), dus dubbelingen moeten eruit gefilterd worden.
        //
        // De sortering die hier plaatsvindt is van groot belang voor alle hierop
        // volgende code.
        indeling.toewijzingQueue = markt.ondernemers
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

    assignPlaatsen: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer,
        sizes?: SizeMap
    ): IMarktindeling => {
        try {
            const plaatsen = indeling.openPlaatsen;

            if (!plaatsen.length) {
                throw ADJACENT_UNAVAILABLE;
            } else if (
                !Ondernemer.isVast(ondernemer) &&
                Ondernemer.isInMaxedOutBranche(indeling, ondernemer)
            ) {
                throw BRANCHE_FULL;
            }

            if (!sizes ) {
                sizes = Indeling.calcSizes(indeling);
            }

            const { anywhere = !Ondernemer.isVast(ondernemer) } = ondernemer.voorkeur || {};
            const size          = sizes.get(ondernemer);
            const bestePlaatsen = Indeling._findBestePlaatsen(indeling, ondernemer, plaatsen, size, anywhere);

            if (!bestePlaatsen.length) {
                throw ADJACENT_UNAVAILABLE;
            }

            return bestePlaatsen.reduce((indeling, plaats) => {
                return Toewijzing.add(indeling, ondernemer, plaats);
            }, indeling);
        } catch (errorMessage) {
            return Indeling._rejectOndernemer(indeling, ondernemer, errorMessage);
        }
    },

    calcSizes: (
        indeling: IMarktindeling,
        plaatsen: IMarktplaats[] = indeling.openPlaatsen,
        ondernemers: IMarktondernemer[] = indeling.toewijzingQueue
    ): SizeMap => {
        plaatsen    = plaatsen.slice();
        ondernemers = ondernemers.slice();
        const sizes = new Map();

        while (ondernemers.length) {
            const ondernemer  = ondernemers[0];
            const isVast      = Ondernemer.isVast(ondernemer);
            const { anywhere = !isVast } = ondernemer.voorkeur || {};

            const totalSpots  = plaatsen.length;
            const minRequired = ondernemers.reduce((sum, ondernemer) => {
                // We gaan er vanuit dat alle plaatsen van deze VPH in de `plaatsen` array zitten.
                const startSize = Ondernemer.isVast(ondernemer) ?
                                  Ondernemer.getStartSize(ondernemer) :
                                  1;
                return sum + startSize;
            }, 0);
            const startSize = isVast ? Ondernemer.getStartSize(ondernemer) : 1;
            const happySize = startSize === 1 ?
                              Math.min(Ondernemer.getTargetSize(ondernemer), 2) :
                              startSize;
            const size      = totalSpots > minRequired ? happySize:
                              totalSpots > 0           ? startSize :
                                                         0;

            const bestePlaatsen = Indeling._findBestePlaatsen(indeling, ondernemer, plaatsen, size, anywhere);
            sizes.set(ondernemer, bestePlaatsen.length);

            plaatsen = plaatsen.filter(plaats =>
                !bestePlaatsen.find(({ plaatsId }) => plaatsId === plaats.plaatsId)
            );
            ondernemers.shift();
        }

        return sizes;
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

    // Als een VPH voorkeuren heeft opgegeven, dan geven zij daarmee aan dat ze
    // willen verplaatsen. We beschouwen een VPH eveneens als een verplaatser
    // als niet al hun vaste plaatsen beschikbaar zijn.
    willMove: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer
    ): boolean => {
        const vastePlaatsen = Ondernemer.getVastePlaatsen(indeling, ondernemer);
        const beschikbaar = vastePlaatsen.filter(plaats => Indeling._isAvailable(indeling, plaats));
        const voorkeuren = Ondernemer.getPlaatsVoorkeuren(indeling, ondernemer, false);

        return beschikbaar.length < vastePlaatsen.length || !!voorkeuren.length;
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
        indeling: IMarktindeling,
        brancheId: BrancheId = undefined,
        iteration: number = 2
    ): IMarktindeling => {
        const queue = indeling.toewijzingen.filter(toewijzing =>
            Ondernemer.wantsExpansion(toewijzing) && (
                !brancheId ||
                (brancheId === 'evi' && Ondernemer.heeftEVI(toewijzing.ondernemer)) ||
                Ondernemer.heeftBranche(toewijzing.ondernemer, brancheId)
            )
        );

        if(
            !indeling.openPlaatsen.length ||
            !queue.length ||
            iteration > indeling.expansionLimit
        ) {
            // The people still in the queue have fewer places than desired. Check if they
            // must be rejected because of their `minimum` setting.
            return queue.reduce((indeling, toewijzing) => {
                const { ondernemer, plaatsen } = toewijzing;
                const { minimum = 0 } = ondernemer.voorkeur || {};

                return minimum > plaatsen.length ?
                       Indeling._rejectOndernemer(indeling, ondernemer, MINIMUM_UNAVAILABLE) :
                       indeling;
            }, indeling);
        }

        indeling = queue.reduce((indeling, toewijzing) => {
            const { ondernemer } = toewijzing;

            if (!Ondernemer.canExpandInIteration(indeling, iteration, toewijzing)) {
                return indeling;
            }

            const openAdjacent = Markt.getAdjacentPlaatsen(indeling, toewijzing.plaatsen, 1);
            const [uitbreidingPlaats] = Indeling._findBestePlaatsen(indeling, ondernemer, openAdjacent, 1, true);

            return uitbreidingPlaats ?
                   Toewijzing.add(indeling, ondernemer, uitbreidingPlaats) :
                   indeling;
        }, indeling);

        return Indeling.performExpansion(indeling, brancheId, ++iteration);
    },

    _findBestGroup: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer,
        groups: IPlaatsvoorkeur[][],
        size: number = 1,
        compare?: (best: IPlaatsvoorkeur[], current: IPlaatsvoorkeur[]) => number
    ): IMarktplaats[] => {
        const minimumSize = Math.min(size, Ondernemer.getStartSize(ondernemer));

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
                group.length >= minimumSize &&
                // Zolang we het maximaal aantal gewenste aantal plaatsen nog niet hebben
                // bereikt blijven we doorzoeken.
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
            // 0. Geen overlap
            // 1. Gedeeltelijke overlap:          ondernemer['x']      vs plaats['x', 'y']
            // 2. Gedeeltelijk de andere kant op: ondernemer['x', 'y'] vs plaats['x']
            // 3. Volledige overlap:              ondernemer['x', 'y'] vs plaats['x', 'y']
            const plaatsBrancheCount     = branches.length;
            const ondernemerBrancheCount = ondernemerBrancheIds.length;
            const intersectCount         = intersection(branches, ondernemerBrancheIds).length;
            const brancheScore           = !intersectCount                             ? 0 :
                                           intersectCount - plaatsBrancheCount < 0     ? 1 :
                                           ondernemerBrancheCount > plaatsBrancheCount ? 2 :
                                                                                         3;
            // De voorkeurscore betekent: hoe meer ondernemers deze plaats als voorkeur hebben
            // opgegeven, hoe hoger de score. Dit getal wordt gebruikt voor ondernemers die flexibel
            // ingedeeld willen worden. We proberen deze ondernemers op een plaats te zetten waar
            // geen of zo min mogelijk ondernemers een voorkeur voor hebben uitgesproken.
            const voorkeurScore          = Ondernemers.countPlaatsVoorkeurenFor(indeling, plaats.plaatsId);

            // TODO: Voeg verplichte branches en EVI toe, zodat flexibele ondernemers niet op een van
            //       deze plekken komen terwijl er in de B-lijst nog ondernemers zijn die hier op willen
            //       staan.

            return {
                ...plaats,
                priority,
                brancheScore,
                voorkeurScore
            };
        })
        .sort((a, b) =>
            b.brancheScore - a.brancheScore ||
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
            (a: IPlaatsvoorkeurPlus[], b: IPlaatsvoorkeurPlus[]) => {
                // Kijk eerst of er een betere branche overlap is...
                let aScore = a.map(pl => pl.brancheScore).reduce(sum, 0);
                let bScore = b.map(pl => pl.brancheScore).reduce(sum, 0);
                if (bScore - aScore) {
                    return bScore - aScore;
                }
                // ... kijk vervolgens naar de prioriteit...
                aScore = a.map(pl => pl.priority || 0).reduce(sum, 0);
                bScore = b.map(pl => pl.priority || 0).reduce(sum, 0);
                if (bScore - aScore) {
                    return bScore - aScore;
                }
                // ... en als laatste naar het aantal ondernemers die deze plaats
                // als voorkeur hebben.
                aScore = a.map(pl => pl.voorkeurScore || 0).reduce(sum, 0);
                bScore = b.map(pl => pl.voorkeurScore || 0).reduce(sum, 0);
                return aScore - bScore;
            }
        );
    },

    // Bepaalt samen met `_compareOndernemers` de volgorde van indeling:
    // 0. VPHs die niet willen verplaatsen.
    // 1. Ondernemers die willen bakken (kan ook een VPH zijn die wil verplaatsen).
    // 2. Ondernemers met een EVI (kan ook een VPH zijn die wil verplaatsen).
    // 3. VPHs die willen/moeten verplaatsen.
    // 4. Sollicitanten in een branche.
    // 5. Sollicitanten zonder branche (in principe niet de bedoeling).
    _getStatusGroup: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer
    ): number => {
        return Ondernemer.heeftVastePlaatsen(ondernemer) &&
               !Indeling.willMove(indeling, ondernemer)      ? 0 :
               Ondernemer.heeftBranche(ondernemer, 'bak')    ? 1 :
               Ondernemer.heeftEVI(ondernemer)               ? 2 :
               Ondernemer.heeftVastePlaatsen(ondernemer)     ? 3 :
                                                               4;
    },
    // Wordt in `_compareOndernemers` als tweede sorteercriterium gebruikt:
    // 0. Ondernemer is VPH.
    // 1. Ondernemer die voorkomt in de A-lijst.
    // 2. Ondernemer die niet voorkomt in de A-lijst.
    _getListGroup: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer
    ): number => {
        return Ondernemer.heeftVastePlaatsen(ondernemer) ? 0 :
               indeling.aLijst.includes(ondernemer)      ? 1 :
                                                           2;
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
    },

    _compareOndernemers: (
        indeling: IMarktindeling,
        a: IMarktondernemer,
        b: IMarktondernemer
    ): number => {
        // Sorteer eerst op status groep...
        const sort1 = Indeling._getStatusGroup(indeling, a) -
                      Indeling._getStatusGroup(indeling, b);
        // ... dan op aanwezigheid in de A-lijst...
        const sort2 = Indeling._getListGroup(indeling, a) -
                      Indeling._getListGroup(indeling, b);
        // ... dan op anciënniteitsnummer.
        const sort3 = a.sollicitatieNummer - b.sollicitatieNummer;

        return sort1 || sort2 || sort3;
    }
};

export default Indeling;
