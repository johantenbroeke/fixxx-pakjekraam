import { getMarkt } from '../makkelijkemarkt-api';
import { getMarktProperties, getMarktPaginas, getMarktplaatsen } from '../pakjekraam-api';
// import { MMMarkt } from '../makkelijkemarkt.model';
// import { IMarkt } from '../markt.model';

export const getMarktEnriched = (marktId: string) => {

    return Promise.all([
        getMarkt(marktId),
        getMarktProperties(marktId),
        getMarktplaatsen(marktId),
        getMarktPaginas(marktId),
    ]).then(result => {
        const [ markt, marktProperties, plaatsen, paginas ] = result;
        return {
            ...markt,
            ...marktProperties,
            plaatsen,
            paginas,
        };
    });

};
