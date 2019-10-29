import { getMarkt } from '../makkelijkemarkt-api';
import { getMarktProperties, getMarktPaginas, getMarktplaatsen, getMarktInfo } from '../pakjekraam-api';
// import { MMMarkt } from '../makkelijkemarkt.model';
// import { IMarkt } from '../markt.model';

export const getMarktEnriched = (marktId: string) => {

    return Promise.all([
        getMarkt(marktId),
        getMarktProperties(marktId),
        getMarktplaatsen(marktId),
        getMarktPaginas(marktId),
        getMarktInfo(marktId),
    ]).then(result => {
        const [ markt, marktProperties, plaatsen, paginas, info ] = result;
        return {
            ...markt,
            ...marktProperties,
            plaatsen,
            paginas,
            ...info,
        };
    });

};
