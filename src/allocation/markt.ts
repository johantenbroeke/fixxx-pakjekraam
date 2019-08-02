import {
    IMarktplaats,
    IObstakelBetween,
    PlaatsId
} from '../markt.model';

import {
    exclude,
    flatten,
    isEqualArray,
    unique
} from '../util';

const Markt = {
    getAdjacentPlaatsen: (
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
            return !obstakels.find(obstakel => {
                const plaatsIdA = plaatsId;
                const plaatsIdB = plaatsB.plaatsId;

                return (obstakel.kraamA === plaatsIdA && obstakel.kraamB === plaatsIdB) ||
                       (obstakel.kraamA === plaatsIdB && obstakel.kraamB === plaatsIdA);
            });
        });
    },

    getAdjacentPlaatsenForMultiple: (
        rows: IMarktplaats[][],
        plaatsIds: PlaatsId[],
        obstakels: IObstakelBetween[] = []
    ): IMarktplaats[] => {
        return plaatsIds
        .map(plaatsId => Markt.getAdjacentPlaatsen(rows, plaatsId, obstakels))
        .reduce(flatten, [])
        .reduce(unique, []);
    },

    /*
     * Returns adjacent places in either direction,
     * `steps` defines the limit of how far to look in either direction.
     * The number of adjacent spots can be greater than  the number of steps, if a number
     * of spots is available in either direction.
     */
    getAdjacentPlaatsenRecursive: (
        rows: IMarktplaats[][],
        plaatsId: string,
        steps: number = 1,
        obstakels: IObstakelBetween[] = []
    ): string[] => {
        let plaatsen: string[]     = [plaatsId];
        let prevPlaatsen: string[] = [];
        let i = 0;

        while (i < steps && !isEqualArray(plaatsen, prevPlaatsen)) {
            const newPlaatsen: string[] = exclude(plaatsen, prevPlaatsen);
            prevPlaatsen = plaatsen;

            const adjacentPlaatsen = newPlaatsen
                .map(p => Markt.getAdjacentPlaatsen(rows, p, obstakels))
                .reduce(flatten, [])
                .map(({ plaatsId }) => plaatsId);

            plaatsen = [...plaatsen, ...adjacentPlaatsen];

            i++;
        }

        plaatsen = exclude(plaatsen, [plaatsId]);

        return plaatsen;
    }
};

export default Markt;
