import {
    getMarkt,
    getMarkten
} from '../makkelijkemarkt-api';
import {
    getMarktProperties,
    getMarktPaginas,
    getMarktplaatsen,
    getDaysClosed
} from '../pakjekraam-api';

import {
    IMarktEnriched
} from '../markt.model';
import {
    MMMarkt,
    MMOndernemerStandalone
} from 'makkelijkemarkt.model';

import {
    DAYS_CLOSED
} from '../domain-knowledge';
import {
    addDays,
    dateDiffInDays,
    formatDayOfWeekShort,
    getMaDiWoDo,
    today
} from '../util';

export const getMarktenByDate = (marktDate: string) => {
    return getMarkten()
    .then(markten => {
        if (DAYS_CLOSED.includes(marktDate)) {
            console.log('Alle markten zijn vandaag gesloten');
            return [];
        } else {
            const day = new Date(marktDate);
            return markten.filter(({
                marktDagen,
                kiesJeKraamGeblokkeerdeData
            }) => {
                return marktDagen.includes(getMaDiWoDo(day)) && (
                           !kiesJeKraamGeblokkeerdeData ||
                           !kiesJeKraamGeblokkeerdeData.split(',').includes(marktDate)
                       );
            });
        }
    });
};

export const getMarktEnriched = (marktId: string): Promise<IMarktEnriched> => {
    return getMarkt(marktId)
    .then(mmarkt =>
        Promise.all([
            getMarktProperties(mmarkt),
            getMarktplaatsen(mmarkt),
            getMarktPaginas(mmarkt),
        ]).then(result => {
            const [marktProperties, plaatsen, paginas] = result;
            return {
                ...mmarkt,
                ...marktProperties,
                plaatsen,
                paginas
            };
        })
    );
};

export const getNextMarktDate = (markt: MMMarkt, skipDays: number) => {
    if (!markt.marktDagen) {
        return undefined;
    }

    if (skipDays) {
        const diff = dateDiffInDays(today(), getNextMarktDate(markt, 0));
        skipDays += diff;
    }

    const dateString = addDays(today(), skipDays);
    return isMarketDay(markt, dateString) && !isMarketClosed(markt, dateString) ?
           dateString :
           getNextMarktDate(markt, skipDays+1);
};

export const isMarketDay = (markt: MMMarkt, dateString: string) => {
    const dayShort = formatDayOfWeekShort(dateString);
    return markt.marktDagen && markt.marktDagen.includes(dayShort);
};

export const isMarketClosed = (markt: MMMarkt, dateString: string) => {
    const dateInDaysClosed = DAYS_CLOSED.includes(dateString);
    if (!markt.kiesJeKraamGeblokkeerdeData || dateInDaysClosed) {
        return dateInDaysClosed;
    }

    const blockedDates = markt.kiesJeKraamGeblokkeerdeData.replace(/\s+/g, '').split(',');
    return blockedDates.includes(dateString);
};
