import {
    getMarkt as getMakkelijkeMarkt,
} from '../makkelijkemarkt-api';
import { getMarktProperties, getMarktPaginas, getMarktplaatsen, getMarkten, getDaysClosed } from '../pakjekraam-api';
import { IMarktEnriched } from '../markt.model';
import { MMMarkt } from 'makkelijkemarkt.model';

import { getMaDiWoDo } from '../util';

export const getMarktEnriched = (marktId: string): Promise<IMarktEnriched> => {
    return getMakkelijkeMarkt(marktId)
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
            }))
};

export const getMarkt = (marktId: string): Promise<MMMarkt> =>
    getMakkelijkeMarkt(marktId);


export const getMarktenEnabled = () => {
    return getMarkten()
        .then(markten => {
            return markten.filter((markt: any) => markt.kiesJeKraamActief);
        });
};

export const marktZichtbaarOndernemers = (markt: any) => {
    return (markt.kiesJeKraamFase === 'wenperiode' || markt.kiesJeKraamFase === 'live' || markt.kiesJeKraamFase === 'activatie') && markt.kiesJeKraamActief;
};

export const getMarktenZichtbaarOndernemers = () => {
    return getMarkten()
        .then((markten: any) => markten.filter((markt: any) =>
            marktZichtbaarOndernemers(markt)
        ));
};

export const getMarktenByDate = (marktDate: string) => {

    const day = new Date(marktDate);

    return Promise.all([
        getMarkten(),
        getDaysClosed()
    ])
        .then(([markten, daysClosed]) => {
            // console.log(markten);
            if (daysClosed.includes(marktDate)) {
                console.log('Alle markten zijn vandaag gesloten');
                return [];
            } else {
                return markten
                    .filter(({ kiesJeKraamActief }) => kiesJeKraamActief)
                    .filter(({ marktDagen }) => marktDagen.includes(getMaDiWoDo(day)))
                    .filter(({ kiesJeKraamGeblokkeerdeData }) => {
                        if (!kiesJeKraamGeblokkeerdeData) {
                            return true;
                        } else {
                            return !kiesJeKraamGeblokkeerdeData.split(',').includes(marktDate);
                        }
                    });
            }
        });
};
