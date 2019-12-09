import { allocation as Allocation } from './index';
import { IToewijzing, IMarkt } from 'markt.model';
import { getVoorkeurByMarktEnOndernemer  } from './voorkeur.functions';
import { getPlaatsvoorkeurenByMarktEnOndernemer  } from './plaatsvoorkeur.functions';

export const deleteAllocationsByErkenningsnummer = (erkenningsNummer: string) =>
    Allocation.destroy({ where: { erkenningsNummer } });

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
        toewijzing.brancheId = voorkeuren ? voorkeuren.brancheId : null;

        return toewijzing;
    });
};
