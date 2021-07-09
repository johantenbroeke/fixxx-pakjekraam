const axios = require('axios');
import { AxiosInstance, AxiosResponse } from 'axios';
import { addDays, MONDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY, requireEnv } from './util';

import {
    MMMarkt,
    MMOndernemerStandalone,
    MMSollicitatieStandalone,
    MMOndernemer,
    MMSollicitatie
} from './makkelijkemarkt.model';
import {
    IMarktondernemer
} from './markt.model';

import { session } from './model/index';
import { upsert } from './sequelize-util';

import {
    A_LIJST_DAYS,
    formatOndernemerName
} from './domain-knowledge';

const packageJSON = require('../package.json');

const MILLISECONDS_IN_SECOND = 1000;
const SECONDS_IN_MINUTE = 60;
const MINUTES_IN_HOUR = 60;

requireEnv('API_URL');
requireEnv('API_MMAPPKEY');
requireEnv('API_READONLY_USER');
requireEnv('API_READONLY_PASS');

const mmConfig = {
    baseUrl         : process.env.API_URL,
    appKey          : process.env.API_MMAPPKEY,
    loginUrl        : 'login/basicUsername/',
    username        : process.env.API_READONLY_USER,
    password        : process.env.API_READONLY_PASS,
    clientApp       : packageJSON.name,
    clientVersion   : packageJSON.version,
    sessionKey      : 'mmsession',
    sessionLifetime : MILLISECONDS_IN_SECOND * SECONDS_IN_MINUTE * MINUTES_IN_HOUR * 6,
};
const getApi = () =>
    axios.create({
        baseURL: mmConfig.baseUrl,
        headers: {
            MmAppKey: mmConfig.appKey,
        },
    });
const login = (api: AxiosInstance) =>
    api.post(mmConfig.loginUrl, {
        username      : mmConfig.username,
        password      : mmConfig.password,
        clientApp     : mmConfig.clientApp,
        clientVersion : mmConfig.clientVersion,
    });

const apiBase = (
    url: string
): Promise<AxiosResponse> => {
    console.log("MM API request: ", url);
    const api = getApi();
    const getFunction = (url: string, token: string): AxiosResponse => {
        return api.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    };
    const retry = (api: any) => {
        return login(api)
        .then((res: any) => {
            return upsert(session, {
                sid: mmConfig.sessionKey,
            }, {
                sess: { 'token': res.data.uuid },
            }).then(() => res.data.uuid);
        }).then((token: string) => {
            return getFunction(url, token);
        });
    };

    api.interceptors.response.use((response: any) => {
        return response;
    }, (error: any) => {
        if (
            error.response.status === 401 ||
            error.response.status === 403
        ) {
            return retry(api);
        } else {
            return error;
        }
    });

    return session.findByPk(mmConfig.sessionKey)
    .then((sessionRecord: any) => {
        return sessionRecord ?
               getFunction(url, sessionRecord.dataValues.sess.token) :
               retry(api);
    });
};

export const getMarkt = (
    marktId: string
): Promise<MMMarkt> =>
    apiBase(`markt/${marktId}`).then(response => response.data);


export const getMarkten = (
    includeInactive: boolean = false
): Promise<MMMarkt[]> =>
    apiBase('markt/').then(({ data:markten = [] }) =>
        markten.filter(markt =>
            markt.kiesJeKraamActief && (
                includeInactive ||
                markt.kiesJeKraamFase === 'wenperiode' ||
                markt.kiesJeKraamFase === 'live' ||
                markt.kiesJeKraamFase === 'activatie'
            )
        )
    );

export const getMarktenForOndernemer = (
    ondernemer: Promise<MMOndernemerStandalone> | MMOndernemerStandalone,
    includeInactive: boolean = false
): Promise<MMMarkt[]> => {
    return Promise.all([
        getMarkten(includeInactive),
        ondernemer
    ])
    .then(([
        markten,
        ondernemer
    ]) => {
        return ondernemer.sollicitaties.reduce((result, sollicitatie) => {
            const markt = markten.find(({ id }) => id === sollicitatie.markt.id);
            return markt ? result.concat(markt) : result;
        }, []);
    });
};

export const getOndernemers = (): Promise<MMSollicitatieStandalone[]> =>
    apiBase('koopman/').then(response => response.data);

export const getOndernemer = (
    erkenningsNummer: string
): Promise<MMOndernemerStandalone> => {
    return apiBase(`koopman/erkenningsnummer/${erkenningsNummer}`)
    .then(response => {
        if (!response || !response.data) {
            throw Error('Ondernemer niet gevonden');
        }

        // Filter inactieve sollicitaties, aangezien we die nooit gebruiken binnen
        // dit systeem.
        const ondernemer = response.data;
        ondernemer.sollicitaties = ondernemer.sollicitaties.filter(sollicitatie => {
            return !sollicitatie.doorgehaald;
        });
        return ondernemer;
    });
};

export const getOndernemersByMarkt = (
    marktId: string
): Promise<IMarktondernemer[]> => {
    return apiBase(`sollicitaties/markt/${marktId}?listLength=10000&includeDoorgehaald=0`)
    .then(response => {
        const sollicitaties: MMSollicitatieStandalone[] = response.data;
        return sollicitaties.map(sollicitatie => {
            const {
                koopman,
                sollicitatieNummer,
                status,
                markt,
                vastePlaatsen
            } = sollicitatie;

            return {
                description      : formatOndernemerName(koopman),
                erkenningsNummer : koopman.erkenningsnummer,
                plaatsen         : vastePlaatsen,
                voorkeur: {
                    marktId          : String(markt.id),
                    erkenningsNummer : koopman.erkenningsnummer,
                    maximum          : Math.max(1, (vastePlaatsen || []).length),
                },
                sollicitatieNummer,
                status,
            };
        });
    });
};

export const getALijst = (
    marktId: string,
    marktDate: string
): Promise<MMOndernemer[]> => {
    const day = new Date(marktDate).getDay();

    if (A_LIJST_DAYS.includes(day)) {
        const monday = addDays(marktDate, MONDAY - day),
            thursday = addDays(marktDate, THURSDAY - day);

        return apiBase(`rapport/aanwezigheid/${marktId}/${monday}/${thursday}`).then(response => response.data);
    } else {
        return new Promise(resolve => resolve([]));
    }
};

export const checkActivationCode = (
    username: string,
    code: string
): Promise<any> =>
    getOndernemer(username)
    .then(ondernemer => {
        if (!ondernemer.pasUid) {
            throw Error('Incorrect username/password');
        }

        return typeof code === 'string' &&
               code.length > 0 &&
               code === ondernemer.pasUid;
    });

export const checkLogin = (): Promise<any> => {
    const api = getApi();
    return login(api).then((res: AxiosResponse) =>
        console.log('Login OK'),
    );
};
