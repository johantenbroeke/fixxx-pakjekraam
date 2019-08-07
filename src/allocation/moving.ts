import {
    IMarktindeling,
    IMarktondernemer,
    IMarktplaats,
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
    beterePlaatsen: IMarktplaats[];
};

const Moving = {
    performFor: (
        indeling: IMarktindeling,
        aLijst: IMarktondernemer[],
        toewijzingen: IToewijzing[] = indeling.toewijzingen
    ): IMarktindeling => {
        const MOVE_LIMIT = 100;
        let i = 0;
        let previousState;

        // If `previousState` and `indeling` are equal, this iteration could
        // not make any more changes to the indeling: loop can be stopped.
        do {
            const queue = Moving._generateQueue(indeling, aLijst, toewijzingen);
            previousState = indeling;
            indeling = queue.reduce(Moving._processQueueItem, indeling);
        } while (previousState !== indeling && i++ < MOVE_LIMIT);

        return indeling;
    },

    _generateQueue: (
        indeling: IMarktindeling,
        aLijst: IMarktondernemer[],
        toewijzingen: IToewijzing[] = indeling.toewijzingen
    ): MoveQueueItem[] => {
        return toewijzingen
        .reduce((queue, toewijzing) => {
            const beterePlaatsen = Moving._getBeterePlaatsen(indeling, toewijzing);

            if (beterePlaatsen.length >= toewijzing.plaatsen.length) {
                queue.push({ toewijzing, beterePlaatsen });
            } else {

            }

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

    _getBeterePlaatsen: (
        indeling: IMarktindeling,
        toewijzing: IToewijzing
    ): IMarktplaats[] => {
        const { plaatsen, ondernemer } = toewijzing;
        const voorkeuren   = Ondernemer.getPlaatsVoorkeuren(indeling, ondernemer, false);
        const currentIndex = voorkeuren.findIndex(voorkeur => plaatsen.includes(voorkeur.plaatsId));
        const end          = currentIndex === -1 ? voorkeuren.length : currentIndex;

        const betereVoorkeuren = voorkeuren.slice(0, end);
        return indeling.openPlaatsen.filter(plaats =>
            betereVoorkeuren.find(({ plaatsId }) => plaatsId === plaats.plaatsId)
        );
    },

    _processQueueItem: (indeling: IMarktindeling, item: MoveQueueItem): IMarktindeling => {
        return Indeling.assignPlaats(
            indeling,
            item.toewijzing.ondernemer,
            intersection(item.beterePlaatsen, indeling.openPlaatsen),
            'ignore',
            item.toewijzing.plaatsen.length
        );
    }
};

export default Moving;
