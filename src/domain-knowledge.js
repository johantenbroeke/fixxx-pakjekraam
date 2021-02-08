const fs = require('fs');

const {
    DeelnemerStatus
} = require('./markt.model.ts');

const {
    ISO_SUNDAY,
    ISO_MONDAY,
    ISO_TUESDAY,
    ISO_WEDNESDAY,
    ISO_THURSDAY,
    ISO_FRIDAY,
    ISO_SATURDAY,
    FRIDAY,
    SATURDAY,
    SUNDAY,
    MILLISECONDS_IN_DAY,
    DAYS_IN_WEEK,
    toISODate,
    addDays,
    endOfWeek,
    stringSort,
    getMaDiWoDo,
    getTimezoneTime,
} = require('./util.ts');

const moment = require('moment');

const dagen = {
    zo: 0,
    ma: 1,
    di: 2,
    wo: 3,
    do: 4,
    vr: 5,
    za: 6,
};

const parseMarktDag = dag => (dagen.hasOwnProperty(dag) ? dagen[dag] : -1);

const isoMarktDagen = {
    ma: ISO_MONDAY,
    di: ISO_TUESDAY,
    wo: ISO_WEDNESDAY,
    do: ISO_THURSDAY,
    vr: ISO_FRIDAY,
    za: ISO_SATURDAY,
    zo: ISO_SUNDAY,
};

const DAYS_CLOSED = (function() {
    try {
        const data = fs.readFileSync(`${__dirname}/../config/markt/daysClosed.json`);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error(`Could not read JSON file: config/markt/daysClosed.json`);
        process.exit(1);
    }
})();

const A_LIJST_DAYS = [FRIDAY, SATURDAY, SUNDAY];

const INDELINGSTIJDSTIP = '21:00';
const INDELINGSTIJDSTIP_TEXT = "21 uur 's avonds";
const INDELING_DAG_OFFSET = 1;

const indelingstijdstipInMinutes = () => {
    const hours = parseInt(INDELINGSTIJDSTIP.split(":", 1), 10);
    const minutes = parseInt(INDELINGSTIJDSTIP.split(":", 2)[1], 10);
    return ((60 * hours) + minutes );
};

const allocationHours = () => {
    return parseInt(INDELINGSTIJDSTIP.split(":", 1), 10);
};

const allocationMinutes = () => {
    return parseInt(INDELINGSTIJDSTIP.split(":", 2)[1], 10);
};

const parseISOMarktDag = dag => (isoMarktDagen.hasOwnProperty(dag) ? isoMarktDagen[dag] : -1);

const isVast = status =>
    status === DeelnemerStatus.VASTE_PLAATS ||
    status === DeelnemerStatus.TIJDELIJKE_VASTE_PLAATS ||
    status === DeelnemerStatus.TIJDELIJKE_VASTE_PLAATS_Z ||
    status === DeelnemerStatus.TIJDELIJKE_VASTE_PLAATS_OLD;
const isTVPLZ = status =>
    status === DeelnemerStatus.TIJDELIJKE_VASTE_PLAATS_Z;
const isExp = status =>
    status === DeelnemerStatus.EXPERIMENTAL ||
    status === DeelnemerStatus.EXPERIMENTAL_F;
const isVastOfExp = status =>
    isVast(status) || isExp(status);

const isAfterAllocationTime = () => {
    const timeNow = getTimezoneTime();
    const allocationTime = getTimezoneTime()
        .set("hour", allocationHours() )
        .set("minute", allocationMinutes() );
    return timeNow.isAfter(allocationTime) || timeNow.isSame(allocationTime);
};

// Geeft de datum terug vanaf wanneer ondernemers hun aanwezigheid
// mogen aanpassen.
//
// Dit betekent momenteel: Geef de datum van vandaag, tenzij de indeling
// voor vandaag al gedraaid heeft. Dit hangt af van `INDELINGSTIJDSTIP`.
const getMarktThresholdDate = role => {
    // Door `offsetMins` bij de huidige tijd op te tellen, zal `startDate` naar morgen
    // gaan ipv vandaag als de huidige tijd voorbij indelingstijd ligt.
    const offsetMins = role !== 'marktmeester' ?
                       (( 24 * 60 ) - indelingstijdstipInMinutes()) :
                       0;
    return getTimezoneTime()
           .add(offsetMins, 'minutes')
           .add(INDELING_DAG_OFFSET, 'days')
           .startOf('day')
           .toDate();
};

const getMarktDaysOndernemer = (startDate, endDate, marktdagen) => {
    const start = Date.parse(startDate);
    const end = Date.parse(endDate);

    const days = Math.max(0, (end - start) / MILLISECONDS_IN_DAY);

    let dates = [];

    for (let i = 0, l = days; i <= l; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        dates.push(date);
    }

    dates = dates.filter(day => marktdagen.includes(getMaDiWoDo(day)));
    return dates;
};


const getMarktDays = (startDate, endDate, daysOfWeek) => {
    const start = Date.parse(startDate);
    const end = Date.parse(endDate);
    const days = Math.max(0, (end - start) / MILLISECONDS_IN_DAY);
    const dates = [];

    for (let i = 0; i <= days; i++) {
        const date = new Date(start + i * MILLISECONDS_IN_DAY);
        if (daysOfWeek.includes(date.getDay())) {
            dates.push(date);
        }
    }

    return dates.map(toISODate);
};

const getUpcomingMarktDays = (startDate, endDate, daysOfWeek) =>
    getMarktDays(addDays(startDate, 1), endDate, daysOfWeek);

const formatOndernemerName = ondernemer =>
    `${ondernemer.tussenvoegsels} ${ondernemer.achternaam} ${ondernemer.voorletters}`.replace(/\s+/g, ' ');

const ondernemersToLocatieKeyValue = array =>
    array.reduce((obj, item) => {
        item.plaatsen.reduce((ar, i) => {
            obj[i] = item;

            return ar;
        }, {});

        return obj;
    }, {});

const obstakelsToLocatieKeyValue = array =>
    array.reduce((total, obstakel) => {
        total[obstakel.kraamA] = total[obstakel.kraamA] || obstakel.obstakel;
        total[obstakel.kraamA].concat(obstakel.obstakel);

        return total;
    }, {});

const filterRsvpList = (aanmeldingen, markt, startDate, endDate) => {
    const dates = getMarktDays(
        startDate ? startDate : addDays(moment().day(0).valueOf(), 0),
        endDate ? endDate : addDays(endOfWeek(), DAYS_IN_WEEK),
        (markt.marktDagen || []).map(parseMarktDag),
    );

    const rsvpList = dates.map(date => ({
        date,
        rsvp: aanmeldingen.find(aanmelding => aanmelding.marktDate === date)
    }));

    return rsvpList;
};

const plaatsParts = plaatsId => plaatsId.replace(/([^0-9])([0-9])|([0-9])([^0-9])/g, '$1$3 $2$4').split(/\s+/);
const plaatsSort = (plaatsA, plaatsB, byKey) => {
    const partsA = plaatsParts(byKey ? plaatsA[byKey] : plaatsA);
    const partsB = plaatsParts(byKey ? plaatsB[byKey] : plaatsB);
    const l = Math.min(partsA.length, partsB.length);

    let i = 0;
    let delta = 0;

    for (; delta === 0 && i < l; i++) {
        const partA = partsA[i];
        const partB = partsB[i];

        delta =
            /^[0-9]+$/.test(partA) && /^[0-9]+$/.test(partB)
                ? parseInt(partA, 10) - parseInt(partB, 10)
                : stringSort(partA, partB);
    }

    return delta;
};

const isErkenningsnummer = str => /^\d+$/.test(str);

module.exports = {
    DAYS_CLOSED,
    A_LIJST_DAYS,
    INDELINGSTIJDSTIP,
    INDELINGSTIJDSTIP_TEXT,
    INDELING_DAG_OFFSET,
    formatOndernemerName,
    parseMarktDag,
    parseISOMarktDag,
    isVast,
    isTVPLZ,
    isExp,
    isVastOfExp,
    getMarktDays,
    indelingstijdstipInMinutes,
    getMarktThresholdDate,
    getMarktDaysOndernemer,
    getUpcomingMarktDays,
    ondernemersToLocatieKeyValue,
    obstakelsToLocatieKeyValue,
    filterRsvpList,
    plaatsSort,
    isErkenningsnummer,
    isAfterAllocationTime
};
