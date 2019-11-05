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
        .then( markten => {
            return Promise.all( markten.map(markt => getMarktEnriched(String(markt.id))) );
        })
        .then( markten => {
            return markten.filter((markt: any) => markt.enabled);
        });
};

        // Only show markten for which JSON data with location info exists
        // .then(markten => markten.filter(markt => fs.existsSync(`data/${slugifyMarkt(markt.id)}/locaties.json`)));

// export const getMarktenFiltered = () => {

//     return getMakkelijkeMarkten

//     // return Promise.all([getMakkelijkeMarkten])
//     //     .then(result => {
//     //         console.log(result);
//     //         return result[0];
//     //     })

//     // return getMakkelijkeMarkten
//     //     .then( (markten: MMMarkt[]) =>
//     //         markten.map( (markt: any) => getMarktEnriched(markt.id))
//     //     )
// }
