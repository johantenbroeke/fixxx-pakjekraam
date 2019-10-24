import {
    BrancheId,
    IBranche,
    IMarkt,
    IMarktindeling,
    IMarktondernemer,
    IMarktplaats,
    IPlaatsvoorkeur,
    IToewijzing
} from '../markt.model';

const Ondernemer = {
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
            if (branche) {
                branches.push(branche);
            }
            return branches;
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
        const { plaatsen = [] } = ondernemer;
        const { minimum = Infinity, maximum = Infinity } = ondernemer.voorkeur || {};
        return Math.min(plaatsen.length, minimum, maximum) || 1;
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

    heeftBranche: (
        ondernemer: IMarktondernemer,
        brancheId?: BrancheId
    ): boolean => {
        const brancheIds = Ondernemer.getBrancheIds(ondernemer);
        return brancheId ?
               brancheIds.includes(brancheId) :
               !!brancheIds.length;
    },

    heeftEVI: (ondernemer: IMarktondernemer): boolean => {
        const { verkoopinrichting = [] } = ondernemer.voorkeur || {};
        return !!verkoopinrichting.length;
    },

    heeftVastePlaats: (
        ondernemer: IMarktondernemer,
        plaats: IMarktplaats
    ): boolean => {
        if (!ondernemer.plaatsen) {
            return false;
        }
        return !!ondernemer.plaatsen.includes(plaats.plaatsId);
    },

    heeftVastePlaatsen: (ondernemer: IMarktondernemer): boolean => {
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
    }
};

export default Ondernemer;
