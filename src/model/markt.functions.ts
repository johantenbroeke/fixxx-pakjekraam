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

const isMarktZichtbaar = (markt: any) => {
    return markt.kiesJeKraamActief && (
        markt.kiesJeKraamFase === 'wenperiode' ||
        markt.kiesJeKraamFase === 'live' ||
        markt.kiesJeKraamFase === 'activatie'
    );
};

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
            }));
};

export const getMarktenEnabled = () => {
    return getMarkten()
    .then(markten => {
        return markten.filter((markt: any) => markt.kiesJeKraamActief);
    });
};

export const getMarktenForOndernemer = (
    ondernemer: MMOndernemerStandalone
): Promise<MMMarkt[]> => {
    return Promise.all(ondernemer.sollicitaties.map(sollicitatie =>
        getMarkt(String(sollicitatie.markt.id))
    ))
    .then(markten => {
        return markten.filter(markt => markt.kiesJeKraamActief);
    });
};

export const getZichtbareMarkten = () => {
    return getMarkten().then((markten: any) =>
        markten.filter((markt: any) => isMarktZichtbaar(markt)
    ));
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
            .filter(({ kiesJeKraamActief, marktDagen, kiesJeKraamGeblokkeerdeData }) => {
                return kiesJeKraamActief &&
                       marktDagen.includes(getMaDiWoDo(day)) && (
                           !kiesJeKraamGeblokkeerdeData ||
                           !kiesJeKraamGeblokkeerdeData.split(',').includes(marktDate)
                       );
            });
        }
    });
};
