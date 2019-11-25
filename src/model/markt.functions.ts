import {
    getMarkt as getMakkelijkeMarkt,
} from '../makkelijkemarkt-api';
import { getMarktProperties, getMarktPaginas, getMarktplaatsen, getMarktInfo, getMarkten } from '../pakjekraam-api';
import { IMarktEnriched } from '../markt.model';

export const getMarktEnriched = (marktId: string): Promise<IMarktEnriched> => {
    return Promise.all([
        getMakkelijkeMarkt(marktId),
        getMarktProperties(marktId),
        getMarktplaatsen(marktId),
        getMarktPaginas(marktId),
        getMarktInfo(marktId),
    ]).then(result => {
        const [ mmarkt, marktProperties, plaatsen, paginas, info ] = result;
        return {
            ...mmarkt,
            ...marktProperties,
            plaatsen,
            paginas,
            ...info
        };
    });
};

export const getMarktenEnabled = () => {
    return getMarkten()
        // .then( markten => {
        //     return Promise.all( markten.map(markt => getMarktEnriched(String(markt.id))) );
        // })
        .then( markten => {
            return markten.filter((markt: any) => markt.kiesJeKraamActief);
        });
};

export const marktZichtbaarOndernemers = (markt: any) => {
    return ( markt.kiesJeKraamFase === 'wenperiode' || markt.kiesJeKraamFase === 'live' ) && markt.kiesJeKraamActief;
};

export const getMarktenZichtbaarOndernemers = () => {
    return getMarkten()
        .then((markten: any) => markten.filter( (markt: any) =>
            marktZichtbaarOndernemers(markt)
        ));
};
