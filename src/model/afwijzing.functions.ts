import { IMarkt } from 'markt.model';
import { Afwijzing } from '../model/afwijzing.model';
import { afwijzing } from '../model/index';
import { BRANCHE_FULL, ADJACENT_UNAVAILABLE, MINIMUM_UNAVAILABLE } from '../allocation/indeling';


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
    const reasons = [BRANCHE_FULL, ADJACENT_UNAVAILABLE, MINIMUM_UNAVAILABLE];
    return reasons.find(reason => reason.code === reasonCode);
};

export const printAfwijzingReason = (reasonCode: number) => {
    return getAfwijzingReason(reasonCode).message;
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

