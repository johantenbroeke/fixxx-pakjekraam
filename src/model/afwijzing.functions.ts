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

export const getAfwijzingen = (marktId: string, marktDate: string): Promise<any[]> =>
    afwijzing
        .findAll<Afwijzing>({
            where: { marktId, marktDate },
            raw: true,
        });
