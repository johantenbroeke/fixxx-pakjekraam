import {
    IMarktindeling,
    IMarktondernemer,
    IMarktplaats,
    IPlaatsvoorkeur,
    IToewijzing
} from '../markt.model';

import {
    intersection
} from '../util';

import Indeling from './indeling';
import Ondernemer from './ondernemer';
import Ondernemers from './ondernemers';

type MoveQueueItem = {
    toewijzing: IToewijzing;
    betereVoorkeuren: IPlaatsvoorkeur[];
    openPlaatsen: IMarktplaats[];
    beterePlaatsen: IMarktplaats[];
};

// Reducer for `Moving.processMoveQueue` below.
const move = (indeling: IMarktindeling, item: MoveQueueItem) => {
    return Indeling.findPlaats(
        indeling,
        item.toewijzing.ondernemer,
        intersection(item.beterePlaatsen, indeling.openPlaatsen),
        'ignore',
        item.toewijzing.plaatsen.length
    );
};

const Moving = {
    generateQueue: (
        indeling: IMarktindeling,
        aLijst: IMarktondernemer[],
        toewijzingen: IToewijzing[] = indeling.toewijzingen
    ): MoveQueueItem[] => {
        return toewijzingen
        .reduce((queue, toewijzing) => {
            const betereVoorkeuren = Moving._getBetereVoorkeuren(indeling, toewijzing);
            if (betereVoorkeuren.length < toewijzing.plaatsen.length) {
                return queue;
            }

            queue.push(
                Moving._createQueueItem(indeling, toewijzing, betereVoorkeuren)
            );

            return queue;
        }, [])
        .sort((a, b) => {
            return Ondernemers.compare(
                a.toewijzing.ondernemer,
                b.toewijzing.ondernemer,
                aLijst
            );
        });
    },

    processQueue: (
        indeling: IMarktindeling,
        aLijst: IMarktondernemer[],
        queue: MoveQueueItem[]
    ): IMarktindeling => {
        let i = 0;
        const MOVE_LIMIT = 100;

        for (; queue.length > 0 && i < MOVE_LIMIT; i++) {
            const previousState = indeling;

            indeling = queue.reduce(move, indeling);

            if (previousState === indeling) {
                // This could happen when someone wants to move to an open
                // spot, but something is preventing the move. Just stop
                // trying instead of reaching `MOVE_LIMIT`.
                break;
            }
            // TODO: the new `queue` should be created as copy or subset of the existing `queue`,
            // and when all options to move to a better spot have failed and the options are exhausted,
            // the person should not be included in the new queue.
            queue = Moving.generateQueue(indeling, aLijst);
        }

        return indeling;
    },

    _getBetereVoorkeuren: (
        indeling: IMarktindeling,
        toewijzing: IToewijzing
    ): IPlaatsvoorkeur[] => {
        const { ondernemer, plaatsen } = toewijzing;
        const voorkeuren = Ondernemer.getPlaatsVoorkeuren(indeling, ondernemer, false);
        const currentIndex = voorkeuren.findIndex(voorkeur => plaatsen.includes(voorkeur.plaatsId));
        const end = currentIndex === -1 ? voorkeuren.length : currentIndex;

        return voorkeuren.slice(0, end);
    },

    _createQueueItem: (
        indeling: IMarktindeling,
        toewijzing: IToewijzing,
        betereVoorkeuren: IPlaatsvoorkeur[]
    ): MoveQueueItem => {
        const beterePlaatsen = betereVoorkeuren.map(voorkeur =>
            indeling.marktplaatsen.find(({ plaatsId }) => plaatsId === voorkeur.plaatsId)
        )
        .filter(Boolean);

        const openPlaatsen = betereVoorkeuren.map(voorkeur =>
            indeling.openPlaatsen.find(({ plaatsId }) => plaatsId === voorkeur.plaatsId)
        )
        .filter(Boolean);

        return {
            toewijzing,
            betereVoorkeuren,
            beterePlaatsen,
            openPlaatsen
        };
    }
};

export default Moving;
