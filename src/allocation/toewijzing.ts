import {
    IMarkt,
    IMarktindeling,
    IMarktondernemer,
    IMarktplaats,
    IToewijzing
} from '../markt.model';

import {
    flatten,
    log
} from '../util';

export default {
    create: (markt: IMarkt, plaats: IMarktplaats, ondernemer: IMarktondernemer): IToewijzing => ({
        marktId: markt.marktId,
        marktDate: markt.marktDate,
        plaatsen: [plaats.plaatsId],
        ondernemer,
        erkenningsNummer: ondernemer.erkenningsNummer
    }),

    remove: (indeling: IMarktindeling, toewijzing: IToewijzing) => {
        const { openPlaatsen, toewijzingen } = indeling;

        if (toewijzingen.includes(toewijzing)) {
            log(`Verwijder toewijzing van ${toewijzing.erkenningsNummer} aan ${toewijzing.plaatsen}`);

            const plaatsen = indeling.marktplaatsen.filter(plaats => toewijzing.plaatsen.includes(plaats.plaatsId));

            return {
                ...indeling,
                toewijzingen: toewijzingen.filter(t => t !== toewijzing),
                openPlaatsen: [...openPlaatsen, ...plaatsen]
            };
        } else {
            return indeling;
        }
    },

    find: (indeling: IMarktindeling, ondernemer: IMarktondernemer) =>
        indeling.toewijzingen.find(toewijzing => toewijzing.erkenningsNummer === ondernemer.erkenningsNummer),

    add: (indeling: IMarktindeling, toewijzing: IToewijzing): IMarktindeling => ({
        ...indeling,
        toewijzingQueue: indeling.toewijzingQueue.filter(
            ondernemer => ondernemer.erkenningsNummer !== toewijzing.erkenningsNummer
        ),
        openPlaatsen: indeling.openPlaatsen.filter(plaats => !toewijzing.plaatsen.includes(plaats.plaatsId)),
        toewijzingen: [...indeling.toewijzingen, toewijzing]
    }),

    replace: (indeling: IMarktindeling, remove: IToewijzing, add: IToewijzing): IMarktindeling => ({
        ...indeling,
        toewijzingen: [...indeling.toewijzingen.filter(item => item !== remove), add]
    }),

    merge: (a: IToewijzing, b: IToewijzing): IToewijzing => ({
        ...a,
        ...b,
        plaatsen: flatten(a.plaatsen, b.plaatsen)
    })
};
