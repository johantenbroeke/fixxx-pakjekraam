import {
    BrancheId,
    IBranche,
    IMarkt,
    IMarktindeling,
    IMarktondernemer,
    IMarktplaats,
    IPlaatsvoorkeur,
    IToewijzing,
    PlaatsId
} from '../markt.model';

import Markt from './markt';

const Ondernemer = {
    acceptsRandomAllocation: (
        ondernemer: IMarktondernemer
    ): boolean => {
        const voorkeur = ondernemer.voorkeur;
        return !voorkeur || !('anywhere' in voorkeur) ?
               !Ondernemer.isVast(ondernemer) :
               !!voorkeur.anywhere;
    },

    canExpandInIteration: (
        indeling: IMarktindeling,
        iteration: number,
        toewijzing: IToewijzing
    ): boolean => {
        const { ondernemer, plaatsen } = toewijzing;
        const currentSize = plaatsen.length;
        const targetSize  = Ondernemer.getTargetSize(ondernemer);
        const maxSize     = Math.min(targetSize, iteration);

        return currentSize < maxSize &&
               !Ondernemer.isInMaxedOutBranche(indeling, ondernemer);
    },

    getBrancheIds: (ondernemer: IMarktondernemer): BrancheId[] => {
        const { branches: brancheIds = [] } = ondernemer.voorkeur || {};
        return brancheIds;
    },

    getBranches: (
        markt: IMarkt,
        ondernemer: IMarktondernemer
    ): IBranche[] => {
        const brancheIds = Ondernemer.getBrancheIds(ondernemer);
        return brancheIds.reduce((branches, brancheId) => {
            const branche = markt.branches.find(b => b.brancheId === brancheId);
            return branche ?
                   branches.concat(branche) :
                   branches;
        }, []);
    },

    getPlaatsVoorkeuren: (
        markt: IMarkt,
        ondernemer: IMarktondernemer,
        includeVastePlaatsen: boolean = true
    ): IPlaatsvoorkeur[] => {
        // Merge de vaste plaatsen van deze ondernemer...
        const vastePlaatsen = Ondernemer.getVastePlaatsen(markt, ondernemer);
        // ...met hun verplaatsingsvoorkeuren. Sorteer aflopend op prioriteit...
        const voorkeuren = [
            ...(includeVastePlaatsen ? vastePlaatsen : []),
            ...markt.voorkeuren.filter(({ erkenningsNummer }) => erkenningsNummer === ondernemer.erkenningsNummer)
        ].sort((a, b) =>
            (b.priority || 0) - (a.priority || 0)
        );
        // ...en elimineer duplicaten na sortering. Als `includeVastePlaatsen === false`
        // dan worden ook de vaste plaatsen uit de voorkeuren gehaald.
        return voorkeuren.reduce((unique, voorkeur) => {
            if (
                !unique.find(({ plaatsId }) => plaatsId === voorkeur.plaatsId) && (
                    includeVastePlaatsen ||
                    !vastePlaatsen.find(({ plaatsId }) => plaatsId === voorkeur.plaatsId)
                )
            ) {
                unique.push(voorkeur);
            }
            return unique;
        }, []);
    },

    getStartSize: (ondernemer: IMarktondernemer): number => {
        return Ondernemer.isVast(ondernemer) ?
               Ondernemer.getMinimumSize(ondernemer) :
               1;
    },
    getMinimumSize: (ondernemer: IMarktondernemer): number => {
        const { plaatsen = [] }          = ondernemer;
        let { minimum = 0, maximum = 0 } = ondernemer.voorkeur || {};

        minimum  = minimum || Math.max(plaatsen.length, 1);
        maximum  = maximum || minimum;
        return Math.min(minimum, maximum);
    },
    getTargetSize: (ondernemer: IMarktondernemer): number => {
        const { plaatsen = [] } = ondernemer;
        const { minimum = 1, maximum = 0 } = ondernemer.voorkeur || {};
        return maximum || Math.max(plaatsen.length, minimum, 1);
    },

    getVastePlaatsen: (
        markt: IMarkt,
        ondernemer: IMarktondernemer
    ): IPlaatsvoorkeur[] => {
        const { plaatsen = [] } = ondernemer;
        return plaatsen.map(plaatsId => ({
            plaatsId,
            erkenningsNummer: ondernemer.erkenningsNummer,
            marktId: markt.marktId,
            priority: 0
        }));
    },

    hasBranche: (
        ondernemer: IMarktondernemer,
        brancheId?: BrancheId
    ): boolean => {
        const brancheIds = Ondernemer.getBrancheIds(ondernemer);
        return brancheId ?
               brancheIds.includes(brancheId) :
               !!brancheIds.length;
    },

    hasEVI: (ondernemer: IMarktondernemer): boolean => {
        const { verkoopinrichting = [] } = ondernemer.voorkeur || {};
        return !!verkoopinrichting.length;
    },

    hasVastePlaats: (
        ondernemer: IMarktondernemer,
        plaats: IMarktplaats
    ): boolean => {
        if (!ondernemer.plaatsen) {
            return false;
        }
        return !!ondernemer.plaatsen.includes(plaats.plaatsId);
    },

    hasVastePlaatsen: (ondernemer: IMarktondernemer): boolean => {
        return Ondernemer.isVast(ondernemer) &&
               ondernemer.plaatsen &&
               ondernemer.plaatsen.length > 0;
    },

    isInBranche: (
        ondernemer: IMarktondernemer,
        branche: IBranche
    ): boolean => {
        const brancheIds = Ondernemer.getBrancheIds(ondernemer);
        return brancheIds.includes(branche.brancheId);
    },

    isInMaxedOutBranche: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer
    ): boolean => {
        const branches = Ondernemer.getBranches(indeling, ondernemer);

        // For each branche this ondernemer is in, find out if it has already
        // exceeded the maximum amount of toewijzingen or the maximum amount
        // of plaatsen.
        return !!branches.find(branche => {
            const { maximumToewijzingen, maximumPlaatsen } = branche;
            const brancheToewijzingen = indeling.toewijzingen.filter(({ ondernemer }) =>
                Ondernemer.isInBranche(ondernemer, branche)
            );
            const branchePlaatsen = brancheToewijzingen
                                    .reduce((sum, toewijzing) => sum + toewijzing.plaatsen.length, 0);

            return maximumToewijzingen && brancheToewijzingen.length >= maximumToewijzingen ||
                   maximumPlaatsen     && branchePlaatsen >= maximumPlaatsen;
        });
    },

    isVast: (ondernemer: IMarktondernemer): boolean => {
        return ondernemer.status === 'vpl' || ondernemer.status === 'vkk';
    },

    wantsExpansion: (toewijzing: IToewijzing): boolean => {
        const { ondernemer, plaatsen } = toewijzing;
        const targetSize               = Ondernemer.getTargetSize(ondernemer);
        const currentSize              = plaatsen.length;
        return currentSize < targetSize;
    },

    // Geeft een array met plaats IDs waar deze VPH sowieso op zal staan. Dit
    // komt enkel voor in scenario's waar alle plaatsen (vaste plaatsen + voorkeuren)
    // zich in dezelfde marktrij bevinden en de overspanning van deze plaatsen
    // kleiner is dan 2x het aantal minimum plaatsen. In dat geval zal er altijd
    // een overlap van plaatsen zijn waar deze ondernemer *altijd* op zal staan.
    //
    // Deze plaatsen mogen niet door een andere VPH ingenomen worden, ook al wil
    // eerstgenoemde VPH verplaatsen.
    //
    // TODO: Weinig elegante oplossing. Kan dit verenigd worden met de nieuwe code
    //       in `Indeling.allocateOndernemer` die voorkomt dat een VPH niet op zijn
    //       eigen plek terecht kan als zijn voorkeuren niet beschikbaar zijn?
    willNeverLeave: (
        indeling: IMarktindeling,
        ondernemer: IMarktondernemer
    ): PlaatsId[] => {
        const minSize     = Ondernemer.getMinimumSize(ondernemer);
        const voorkeuren  = Ondernemer.getPlaatsVoorkeuren(indeling, ondernemer);
        const voorkeurIds = voorkeuren.map(({ plaatsId }) => plaatsId);

        try {
            const row     = Markt.findRowForPlaatsen(indeling, voorkeurIds);
            const trimmed = Markt.trimRow(row, voorkeurIds);
            const overlap = 2 * minSize - trimmed.length;

            if (overlap <= 0) {
                return [];
            }

            return trimmed.splice((trimmed.length - overlap) / 2, overlap);
        } catch (e) {
            return [];
        }
    }
};

export default Ondernemer;
