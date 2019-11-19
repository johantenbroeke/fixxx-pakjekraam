import {
    DeelnemerStatus,
    IMarktindeling,
    IMarktondernemer,
    PlaatsId
} from '../markt.model';

const STATUS_PRIORITIES = [
    DeelnemerStatus.SOLLICITANT,
    DeelnemerStatus.TIJDELIJKE_VASTE_PLAATS,
    DeelnemerStatus.VASTE_PLAATS
];

const Ondernemers = {
    compare: (
        a: IMarktondernemer,
        b: IMarktondernemer,
        aLijst: IMarktondernemer[]
    ): number => {
        // Sorteer eerst op aanwezigheid in de A-lijst...
        const sort1 = Number(aLijst.includes(b)) -
                      Number(aLijst.includes(a));
        // ... dan op status (Vastekaarthouders, tijdelijkevasteplaatshouders, sollicitanten)...
        const sort2 = Math.max(STATUS_PRIORITIES.indexOf(b.status), 0) -
                      Math.max(STATUS_PRIORITIES.indexOf(a.status), 0);
        // ... dan op anciënniteitsnummer
        const sort3 = a.sollicitatieNummer - b.sollicitatieNummer;

        return sort1 || sort2 || sort3;
    },

    countPlaatsVoorkeurenFor: (
        indeling: IMarktindeling,
        plaatsId: PlaatsId
    ): number => {
        const result = indeling.voorkeuren.reduce((result, voorkeur) => {
            if( voorkeur.plaatsId === plaatsId ) {
                result.set(voorkeur.erkenningsNummer, voorkeur.priority);
            }
            return result;
        }, new Map());
        return result.size;
    },

    sort: (
        ondernemers: IMarktondernemer[],
        aLijst: IMarktondernemer[] = []
    ): IMarktondernemer[] => {
        return [...ondernemers].sort((a, b) => Ondernemers.compare(a, b, aLijst));
    }
};

export default Ondernemers;
