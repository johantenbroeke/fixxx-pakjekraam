import {
    getMarkt,
    getMarkten
} from '../makkelijkemarkt-api';
import {
    getMarktProperties,
    getMarktPaginas,
    getMarktplaatsen,
    getDaysClosed
} from '../pakjekraam-api';
import { IMarktEnriched } from '../markt.model';
import {
    MMMarkt,
    MMOndernemerStandalone
} from 'makkelijkemarkt.model';

import { getMaDiWoDo } from '../util';

export const getMarktEnriched = (marktId: string): Promise<IMarktEnriched> => {
    return getMarkt(marktId)
    .then(mmarkt =>
        Promise.all([
            getMarktProperties(mmarkt),
            getMarktplaatsen(mmarkt),
            getMarktPaginas(mmarkt),
        ]).then(result => {
            const [marktProperties, plaatsen, paginas] = result;
            return {
                ...mmarkt,
                ...marktProperties,
                plaatsen,
                paginas
            };
        })
    );
};

export const getMarktenByDate = (marktDate: string) => {
    const day = new Date(marktDate);

    return Promise.all([
        getMarkten(),
        getDaysClosed()
    ])
    .then(([markten, daysClosed]) => {
        if (daysClosed.includes(marktDate)) {
            console.log('Alle markten zijn vandaag gesloten');
            return [];
        } else {
            return markten
            .filter(({ marktDagen, kiesJeKraamGeblokkeerdeData }) => {
                return marktDagen.includes(getMaDiWoDo(day)) && (
                           !kiesJeKraamGeblokkeerdeData ||
                           !kiesJeKraamGeblokkeerdeData.split(',').includes(marktDate)
                       );
            });
        }
    });
};
