import * as fs from 'fs';

import Sequelize from 'sequelize';

import { numberSort, stringSort } from './util';
import { formatOndernemerName, isVast } from './domain-knowledge.js';

import {
    allocation,
    plaatsvoorkeur,
    rsvp,
    log
} from './model/index';
import {
    MMMarkt,
    MMOndernemerStandalone
} from './makkelijkemarkt.model';
import {
    IMarkt,
    IBranche,
    IMarktProperties,
    IMarktondernemer,
    IMarktondernemerVoorkeur,
    IMarktondernemerVoorkeurRow,
    IMarktplaats,
    IObstakelBetween,
    IPlaatsvoorkeur,
    IRSVP,
    IToewijzing,
} from './markt.model';
import {
    IAllocationPrintout,
    IAllocationPrintoutPage,
    IMarketRow
} from './model/printout.model';
import { RSVP } from './model/rsvp.model';
import { Allocation } from './model/allocation.model';
import { Plaatsvoorkeur } from './model/plaatsvoorkeur.model';
import { Voorkeur } from './model/voorkeur.model';

import { MarktConfig } from './model/marktconfig';

import {
    getALijst,
    getMarkt,
    getMarkten,
    getOndernemer,
    getOndernemers,
    getOndernemersByMarkt,
} from './makkelijkemarkt-api';
import {
    getVoorkeurenByMarkt
} from './model/voorkeur.functions';

import { calcToewijzingen } from './indeling';

const loadJSON = <T>(path: string, defaultValue: T = null): Promise<T> =>
    new Promise((resolve, reject) => {
        console.log(`Load ${path}`);
        fs.readFile(path, (err, data) => {
            if (err) {
                console.log(err);
                resolve(defaultValue);
            } else {
                try {
                    resolve(JSON.parse(String(data)));
                } catch (e) {
                    console.log(e);
                    reject(e);
                }
            }
        });
    });

export const groupAllocationRows = (toewijzingen: IToewijzing[], row: Allocation): IToewijzing[] => {

    const { marktId, marktDate, erkenningsNummer } = row;

    const existing = toewijzingen.find(toewijzing => toewijzing.erkenningsNummer === erkenningsNummer);

    const voorkeur: IToewijzing = {
        marktId,
        marktDate,
        erkenningsNummer,
        plaatsen: [...(existing ? existing.plaatsen : []), row.plaatsId],
    };

    if (existing) {
        return [...toewijzingen.filter(toewijzing => toewijzing.erkenningsNummer !== erkenningsNummer), voorkeur];
    } else {
        return [...toewijzingen, voorkeur];
    }
};

export const getAanmeldingen = (marktId: string, marktDate: string): Promise<IRSVP[]> =>
    rsvp
        .findAll<RSVP>({
            where: { marktId, marktDate },
            raw: true,
        })
        .then(aanmeldingen => aanmeldingen);

export const getAanmeldingenByOndernemerEnMarkt = (marktId: string, erkenningsNummer: string): Promise<IRSVP[]> =>
    rsvp
        .findAll<RSVP>({
            where: { marktId, erkenningsNummer },
            raw: true,
        })
        .then(aanmeldingen => aanmeldingen);

export const getAanmeldingenByOndernemer = (erkenningsNummer: string): Promise<IRSVP[]> =>
    rsvp
        .findAll<RSVP>({
            where: { erkenningsNummer },
            raw: true,
        })
        .then(aanmeldingen => aanmeldingen);

export const getToewijzingen = (marktId: string, marktDate: string): Promise<IToewijzing[]> =>
    allocation
        .findAll<Allocation>({
            where: { marktId, marktDate },
            raw: true,
        })
        .then(toewijzingen => toewijzingen.reduce(groupAllocationRows, []));

export const getPlaatsvoorkeuren = (marktId: string): Promise<IPlaatsvoorkeur[]> =>
    plaatsvoorkeur
        .findAll<Plaatsvoorkeur>({
            where: { marktId },
            raw: true,
        })
        .then(plaatsvoorkeuren => plaatsvoorkeuren);

const indelingVoorkeurPrio = (voorkeur: IMarktondernemerVoorkeur): number =>
    (voorkeur.marktId ? 1 : 0) | (voorkeur.marktDate ? 2 : 0);

const indelingVoorkeurSort = (a: IMarktondernemerVoorkeur, b: IMarktondernemerVoorkeur) =>
    numberSort(indelingVoorkeurPrio(a), indelingVoorkeurPrio(b));

const indelingVoorkeurMerge = (
    a: IMarktondernemerVoorkeurRow,
    b: IMarktondernemerVoorkeurRow,
): IMarktondernemerVoorkeurRow => {
    const merged = Object.assign({}, a);

    if (b.minimum !== null) {
        merged.minimum = b.minimum;
    }
    if (b.maximum !== null) {
        merged.maximum = b.maximum;
    }
    if (b.krachtStroom !== null) {
        merged.krachtStroom = b.krachtStroom;
    }
    if (b.kraaminrichting !== null) {
        merged.kraaminrichting = b.kraaminrichting;
    }
    if (b.anywhere !== null) {
        merged.anywhere = b.anywhere;
    }
    if (b.brancheId !== null) {
        merged.brancheId = b.brancheId;
    }
    if (b.parentBrancheId !== null) {
        merged.parentBrancheId = b.parentBrancheId;
    }
    if (b.inrichting !== null) {
        merged.inrichting = b.inrichting;
    }
    return merged;
};

const groupByErkenningsNummer = (
    groups: IMarktondernemerVoorkeur[][],
    voorkeur: IMarktondernemerVoorkeur,
): IMarktondernemerVoorkeur[][] => {
    let group;

    for (let i = groups.length; i--;) {
        if (groups[i][0].erkenningsNummer === voorkeur.erkenningsNummer) {
            group = groups[i];
            break;
        }
    }

    if (group) {
        group.push(voorkeur);
    } else {
        groups.push([voorkeur]);
    }

    return groups;
};

const convertVoorkeur = (obj: IMarktondernemerVoorkeurRow): IMarktondernemerVoorkeur => ({
    ...obj,
    branches: [obj.brancheId, obj.parentBrancheId].filter(Boolean),
    verkoopinrichting: obj.inrichting ? [obj.inrichting] : [],
});

const enrichOndernemersWithVoorkeuren = (ondernemers: IMarktondernemer[], voorkeuren: IMarktondernemerVoorkeur[]) => {
    return ondernemers.map(ondernemer => {

        let voorkeurVoorOndernemer = voorkeuren.find(voorkeur => voorkeur.erkenningsNummer === ondernemer.erkenningsNummer);

        if (voorkeurVoorOndernemer === undefined) {
            voorkeurVoorOndernemer = <IMarktondernemerVoorkeur>{
                absentFrom: null,
                absentUntil: null,
            };
        }

        return {
            ...ondernemer,
            voorkeur: { ...ondernemer.voorkeur, ...voorkeurVoorOndernemer }
        };
    });
};

export const getIndelingVoorkeur = (
    erkenningsNummer: string,
    marktId: string = null,
    marktDate: string = null,
): Promise<IMarktondernemerVoorkeur> => {
    const where = {
        erkenningsNummer,
        [Sequelize.Op.and]: [
            { [Sequelize.Op.or]: [{ marktId }, { marktId: null }] },
            { [Sequelize.Op.or]: [{ marktDate }, { marktDate: null }] },
        ],
    };

    return Voorkeur
        .findAll<Voorkeur>({
            where,
            raw: true,
        })
        .then(voorkeuren => voorkeuren.sort(indelingVoorkeurSort).reduce(indelingVoorkeurMerge, null));
};

export const getIndelingVoorkeuren = (
    marktId: string,
    marktDate: string = null,
): Promise<IMarktondernemerVoorkeur[]> => {
    const where = {
        [Sequelize.Op.and]: [
            {
                [Sequelize.Op.or]: marktId ? [{ marktId }, { marktId: null }] : [{ marktId: null }],
            },
            {
                [Sequelize.Op.or]: marktDate ? [{ marktDate }, { marktDate: null }] : [{ marktDate: null }],
            },
        ],
    };

    return Voorkeur
        .findAll<Voorkeur>({
            where,
            raw: true,
        })
        .then(voorkeuren =>
            voorkeuren
                .sort((a, b) => indelingVoorkeurSort(a, b) || stringSort(a.erkenningsNummer, b.erkenningsNummer))
                .reduce(groupByErkenningsNummer, [])
                .map(arr => arr.reduce(indelingVoorkeurMerge)),
        );
};

export const getPlaatsvoorkeurenOndernemer = (erkenningsNummer: string): Promise<IPlaatsvoorkeur[]> =>
    plaatsvoorkeur.findAll<Plaatsvoorkeur>({
        where: { erkenningsNummer },
    });

export const getMarktConfig = (markt: MMMarkt): Promise<any> =>
    MarktConfig.get(markt.afkorting);

export const getMarktBranches = (markt: MMMarkt): Promise<any> =>
    loadJSON(`./config/markt/${markt.afkorting}/branches.json`, []);

export const getMarktProperties = (markt: MMMarkt): Promise<IMarktProperties> =>
    loadJSON(`./config/markt/${markt.afkorting}/markt.json`, {});

export const getMarktplaatsen = (markt: MMMarkt): Promise<IMarktplaats[]> =>
    loadJSON(`./config/markt/${markt.afkorting}/locaties.json`, []);

export const getMarktPaginas = (markt: MMMarkt): Promise<IAllocationPrintout> =>
    loadJSON(`./config/markt/${markt.afkorting}/paginas.json`, []);

export const getMarktGeografie = (markt: MMMarkt): Promise<{ obstakels: IObstakelBetween[] }> =>
    loadJSON(`./config/markt/${markt.afkorting}/geografie.json`, { obstakels: [] });

export const getAllBranches = (markt?: MMMarkt): Promise<IBranche[]> => {
    return Promise.all([
        loadJSON('./config/markt/branches.json', []),
        markt ? getMarktBranches(markt) : []
    ]).then(([allBranches, marktBranches]) => {
        return allBranches.reduce((result, branche) => {
            const marktBranche = marktBranches.find(({ brancheId }) =>
                brancheId === branche.brancheId
            );
            return marktBranche ?
                   result.concat({ ...branche, ...marktBranche }) :
                   result.concat(branche);
        }, []);
    });
};

export const getMededelingen = (): Promise<any> =>
    loadJSON('./config/markt/mededelingen.json', {});

export const getDaysClosed = (): Promise<any> =>
    loadJSON('./config/markt/daysClosed.json', {});

export const getIndelingslijstInput = (marktId: string, marktDate: string) => {
    return getMarkt(marktId).then(mmarkt => {
        const {
            afkorting: marktAfkorting,
            kiesJeKraamGeblokkeerdePlaatsen: geblokkeerdePlaatsen,
        } = mmarkt;

        // Populate the `ondernemer.voorkeur` field
        const ondernemersPromise = Promise.all([
            getOndernemersByMarkt(marktId),
            getVoorkeurenByMarkt(marktId)
        ]).then(([ondernemers, voorkeuren]) => {
            const convertedVoorkeuren = voorkeuren.map(convertVoorkeur);
            return enrichOndernemersWithVoorkeuren(ondernemers, convertedVoorkeuren);
        });

        const marktConfigPromise = MarktConfig.get(marktAfkorting)
        .then(configModel => {
            const config = configModel.data;

            // Verwijder geblokkeerde plaatsen. Voorheen werd een `inactive` property
            // toegevoegd en op `false` gezet, maar aangezien deze nergens werd gecontroleerd
            // (behalve in de indeling), worden de plaatsen nu simpelweg verwijderd.
            if (geblokkeerdePlaatsen) {
                const marktplaatsen = config.locaties;
                const blocked = geblokkeerdePlaatsen.replace(/\s+/g, '').split(',');
                config.locaties = marktplaatsen.filter(({ plaatsId }) =>
                    !blocked.includes(plaatsId)
                );
            }

            return config;
        });

        return Promise.all([
            mmarkt,
            getALijst(marktId, marktDate),
            marktConfigPromise,
            ondernemersPromise,
            getAanmeldingen(marktId, marktDate),
            getPlaatsvoorkeuren(marktId),
        ]).then(([
            markt,
            aLijst,
            marktConfig,
            ondernemers,
            aanmeldingen,
            voorkeuren,
        ]) => {
            const {
                branches,
                markt: marktProperties,
                geografie,
                locaties: marktplaatsen,
                paginas,
            } = marktConfig;

            return {
                naam: '?',
                marktId,
                marktDate,
                aanmeldingen,
                voorkeuren,
                ondernemers,
                paginas,
                obstakels: geografie.obstakels || [],
                markt,
                marktplaatsen,
                aanwezigheid: aanmeldingen,

                branches,

                aLijst: aLijst.map(({ erkenningsnummer }) =>
                    ondernemers.find(({ erkenningsNummer }) => erkenningsnummer === erkenningsNummer),
                ),

                rows: marktProperties.rows.map(row =>
                    row.map(plaatsId => marktplaatsen.find(plaats => plaats.plaatsId === plaatsId))
                ),
            };
        });
    });
};

export const getIndelingslijst = (marktId: string, marktDate: string) => {
    return getMarkt(marktId).then( mmarkt => {
        return Promise.all([
            getOndernemersByMarkt(marktId),
            getAanmeldingen(marktId, marktDate),
            getMarkt(marktId),
            getMarktPaginas(mmarkt),
            getToewijzingen(marktId, marktDate),
            getMarktGeografie(mmarkt),
            getMarktplaatsen(mmarkt),
            getPlaatsvoorkeuren(marktId),
            getVoorkeurenByMarkt(marktId),
            getAllBranches(mmarkt),
        ]).then( result => {
            const [
                ondernemers,
                aanmeldingen,
                markt,
                paginas,
                toewijzingen,
                geografie,
                marktplaatsen,
                plaatsvoorkeuren,
                voorkeuren,
                branches,
            ] = result;
            return {
                ondernemers,
                aanmeldingen,
                markt,
                paginas,
                toewijzingen,
                obstakels: geografie.obstakels || [],
                marktplaatsen,
                plaatsvoorkeuren,
                voorkeuren,
                branches
            };
        });
    });
};

export const calculateIndelingslijst = (
    marktId: string,
    date: string,
    logInput: boolean = false
) => {
    return getIndelingslijstInput(marktId, date)
    .then(data => {
        data = JSON.parse(JSON.stringify(data));

        if (!logInput) {
            return data;
        } else {
            return log.create({
                level: 'debug',
                msg: `Input indelingsberekening voor '${data.markt.naam}' (${marktId}) op ${date}`,
                meta: data
            })
            .then(() => data);
        }
    })
    .then(data => {
        const logMessage = `Marktindeling berekenen: ${data.markt.naam}`;
        console.time(logMessage);
        const indeling = calcToewijzingen(data);
        console.timeEnd(logMessage);

        if (!logInput) {
            return indeling;
        } else {
            return log.create({
                level: 'debug',
                msg: `Output indelingsberekening voor '${data.markt.naam}' (${marktId}) op ${date}`,
                meta: indeling
            })
            .then(() => indeling);
        }
    });
};

export const getToewijzingslijst = (marktId: string, marktDate: string) =>
    // TODO: Request only necessary data, `getIndelingslijstInput` returns too much
    Promise.all([
        getIndelingslijstInput(marktId, marktDate),
        getToewijzingen(marktId, marktDate)
    ]).then(
        ([data, toewijzingen]) => ({
            ...data,
            toewijzingen,
            afwijzingen: [],
        }),
    );

export const getSollicitantenlijstInput = (marktId: string, date: string) =>
    Promise.all([
        getOndernemersByMarkt(marktId).then(ondernemers =>
            ondernemers.filter(({ status }) => !isVast(status)),
        ),
        getAanmeldingen(marktId, date),
        getPlaatsvoorkeuren(marktId),
        getMarkt(marktId),
    ]).then(args => {
        const [ondernemers, aanmeldingen, voorkeuren, markt] = args;
        return {
            ondernemers,
            aanmeldingen,
            voorkeuren,
            markt,
        };
    });

export const getVoorrangslijstInput = (marktId: string, marktDate: string) =>
    Promise.all([
        getOndernemersByMarkt(marktId),
        getAanmeldingen(marktId, marktDate),
        getPlaatsvoorkeuren(marktId),
        getMarkt(marktId),
        getALijst(marktId, marktDate),
        getToewijzingen(marktId, marktDate),
        getIndelingVoorkeuren(marktId),
    ]).then(([ondernemers, aanmeldingen, voorkeuren, markt, aLijst, toewijzingen, algemenevoorkeuren]) => ({
        ondernemers,
        aanmeldingen,
        voorkeuren,
        markt,
        aLijst,
        toewijzingen,
        algemenevoorkeuren,
    }));
