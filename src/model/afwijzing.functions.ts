import { IMarkt, IAfwijzing } from 'markt.model';
import { Afwijzing } from '../model/afwijzing.model';
import { afwijzing } from '../model/index';
import {
    BRANCHE_FULL,
    ADJACENT_UNAVAILABLE,
    MINIMUM_UNAVAILABLE,
    MARKET_FULL
} from '../allocation/afwijzing';

import { getVoorkeurByMarktEnOndernemer  } from './voorkeur.functions';
import { getPlaatsvoorkeurenByMarktEnOndernemer  } from './plaatsvoorkeur.functions';

export const convertAfwijzingForDB = (afwijzing: any, markt: IMarkt, marktDate: string) => {
    return {
        ...afwijzing,
        reasonCode: afwijzing.reason.code,
        erkenningsNummer: afwijzing.ondernemer.erkenningsNummer,
        marktId: markt.marktId,
        marktDate,
    };
};

export const getAfwijzingReason = (reasonCode: number) => {
    const reasons = [
        BRANCHE_FULL,
        ADJACENT_UNAVAILABLE,
        MINIMUM_UNAVAILABLE,
        MARKET_FULL
    ];
    return reasons.find(reason => reason.code === reasonCode);
};

export const printAfwijzingReason = (reasonCode: number) => {
    return getAfwijzingReason(reasonCode).message;
};

export const getAfwijzingEnriched = (afwijzing: IAfwijzing): Promise<IAfwijzing> => {
    return Promise.all([
        getVoorkeurByMarktEnOndernemer(afwijzing.marktId, afwijzing.erkenningsNummer),
        getPlaatsvoorkeurenByMarktEnOndernemer(afwijzing.marktId, afwijzing.erkenningsNummer)
    ]).then(result => {

        const [ voorkeuren, plaatsvoorkeuren ] = result;

        afwijzing.plaatsvoorkeuren = plaatsvoorkeuren.length > 0 ? plaatsvoorkeuren.map(plaats => plaats.plaatsId): null;
        afwijzing.anywhere = voorkeuren ? voorkeuren.anywhere : null;
        afwijzing.minimum = voorkeuren ? voorkeuren.minimum : null;
        afwijzing.maximum = voorkeuren ? voorkeuren.maximum : null;
        afwijzing.bak = voorkeuren ? !!(voorkeuren.parentBrancheId === 'bak') : null;
        afwijzing.eigenMaterieel = voorkeuren ? !!(voorkeuren.inrichting === 'eigen-materieel') : null;
        afwijzing.brancheId = voorkeuren ? voorkeuren.brancheId : null;

        // console.log(afwijzing);

        return afwijzing;
    });
};

export const getAfwijzingen = (marktId: string, marktDate: string): Promise<any[]> =>
    afwijzing
        .findAll<Afwijzing>({
            where: { marktId, marktDate },
            raw: true,
        });

export const getAfwijzingenByOndernemer = (erkenningsNummer: string): Promise<any[]> =>
    afwijzing
        .findAll<Afwijzing>({
            where: { erkenningsNummer },
            raw: true,
        });

export const getAfwijzingenByOndernemerAndMarkt = (marktId: string, erkenningsNummer: string): Promise<any[]> =>
    afwijzing
        .findAll<Afwijzing>({
            where: { erkenningsNummer, marktId },
            raw: true,
        });

