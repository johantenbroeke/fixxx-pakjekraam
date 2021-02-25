import {
    getMarkt,
    getMarkten
} from '../makkelijkemarkt-api';
import {
    getMarktProperties,
    getMarktPaginas,
    getMarktplaatsen
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

export const getNextMarktDate = (
    markt: MMMarkt,
    skipDays: number,
    autoAdjust: boolean = true
) => {
    if (!markt.marktDagen) {
        return undefined;
    }

    // Stel je wilt de twee eerstvolgende marktdagen weten. Dan doe je 2 calls:
    // 1. `getNextMarktDate(markt, 0)`
    // 2. `getNextMarktDate(markt, 1)`
    //
    // De eerstvolgende marktdag blijkt morgen te zijn. Dan geeft de eerst call
    // de datum van morgen terug, en de tweede call ook. Onderstaande `autoAdjust`
    // code corrigeert de tweede call: Hij skipt dagen vanaf de eerste relevante
    // marktdag. Op die manier geeft de tweede call de datum van overmorgen terug.
    if (autoAdjust && skipDays) {
        const diff = dateDiffInDays(today(), getNextMarktDate(markt, 0, false));
        skipDays += diff;
    }

    const dateString = addDays(today(), skipDays);
    return isMarketDay(markt, dateString) && !isMarketClosed(markt, dateString) ?
           dateString :
           getNextMarktDate(markt, skipDays+1, false);
};

export const isMarketDay = (markt: MMMarkt, dateString: string) => {
    const dayShort = formatDayOfWeekShort(dateString);
    return markt.marktDagen && markt.marktDagen.includes(dayShort);
};

export const isMarketClosed = (markt: MMMarkt, dateString: string) => {
    if (!isMarketDay(markt, dateString)) {
        return true;
    }

    const dateInDaysClosed = DAYS_CLOSED.includes(dateString);
    if (!markt.kiesJeKraamGeblokkeerdeData || dateInDaysClosed) {
        return dateInDaysClosed;
    }

    const blockedDates = markt.kiesJeKraamGeblokkeerdeData.replace(/\s+/g, '').split(',');
    return blockedDates.includes(dateString);
};
