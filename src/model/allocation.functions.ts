import { allocation } from './index';
import { IToewijzing, IMarkt } from 'markt.model';
import { getVoorkeurByMarktEnOndernemer  } from './voorkeur.functions';
import { getPlaatsvoorkeurenByMarktEnOndernemer  } from './plaatsvoorkeur.functions';

import { Allocation } from './allocation.model';
import { groupAllocationRows } from '../pakjekraam-api';

export const deleteAllocationsByErkenningsnummer = (erkenningsNummer: string) =>
    allocation.destroy({ where: { erkenningsNummer } });

export const convertToewijzingForDB = (toewijzing: IToewijzing[], markt: IMarkt, marktDate: string) => {
    return {
        ...toewijzing,
        marktId: markt.marktId,
        marktDate,
    };
};

export const getToewijzingEnriched = (toewijzing: IToewijzing): Promise<IToewijzing> => {
    return Promise.all([
        getVoorkeurByMarktEnOndernemer(toewijzing.marktId, toewijzing.erkenningsNummer),
        getPlaatsvoorkeurenByMarktEnOndernemer(toewijzing.marktId, toewijzing.erkenningsNummer)
    ]).then(result => {
        const [ voorkeuren, plaatsvoorkeuren ] = result;

        toewijzing.plaatsvoorkeuren = plaatsvoorkeuren.length > 0 ? plaatsvoorkeuren.map(plaats => plaats.plaatsId): null;
        toewijzing.anywhere = voorkeuren ? voorkeuren.anywhere : null;
        toewijzing.minimum = voorkeuren ? voorkeuren.minimum : null;
        toewijzing.maximum = voorkeuren ? voorkeuren.maximum : null;
        toewijzing.bak = voorkeuren ? !!(voorkeuren.parentBrancheId === 'bak') : null;
        toewijzing.eigenMaterieel = voorkeuren ? !!(voorkeuren.inrichting === 'eigen-materieel') : null;
        toewijzing.brancheId = voorkeuren ? voorkeuren.brancheId : null;

        return toewijzing;
    });
};


const toewijzingenPerDatum = (toewijzingen: IToewijzing[], row: Allocation): IToewijzing[] => {

    const { marktId, marktDate, erkenningsNummer } = row;

    const existing = toewijzingen.find(toewijzing => toewijzing.marktDate === marktDate);

    const voorkeur: IToewijzing = {
        ...row,
        plaatsen: [...(existing ? existing.plaatsen : []), row.plaatsId],
    };

    if (existing) {
        return [...toewijzingen.filter(toewijzing => toewijzing.marktDate !== marktDate), voorkeur];
    } else {
        return [...toewijzingen, voorkeur];
    }

};

export const getToewijzingenByMarktAndDate = (marktId: string, marktDate: string): Promise<IToewijzing[]> =>
    allocation
        .findAll<Allocation>({
            where: { marktId, marktDate },
            raw: true,
        })
        .then(toewijzingen => toewijzingen.reduce(groupAllocationRows, []));

export const getToewijzingenByOndernemer = (erkenningsNummer: string): Promise<IToewijzing[]> =>
        allocation
            .findAll<Allocation>({
                where: { erkenningsNummer },
                raw: true,
            })
            .then(toewijzingen => {
                return toewijzingen.reduce(toewijzingenPerDatum, []);
            });
