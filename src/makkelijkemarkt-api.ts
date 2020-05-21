import { AxiosInstance, AxiosResponse } from 'axios';
import { addDays, MONDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY, requireEnv } from './util';
import {
    MMMarkt,
    MMOndernemerStandalone,
    MMSollicitatieStandalone,
    MMOndernemer,
    MMSollicitatie
} from './makkelijkemarkt.model';

const packageJSON = require('../package.json');
const axios = require('axios');

import { session } from './model/index';
import { upsert } from './sequelize-util';

import { A_LIJST_DAYS } from './domain-knowledge';

const MILLISECONDS_IN_SECOND = 1000;
const SECONDS_IN_MINUTE = 60;
const MINUTES_IN_HOUR = 60;

import { convertSollicitatieToOndernemer as convertSollicitatie } from './model/ondernemer.functions';

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

const apiBase = (url: string): Promise<AxiosResponse> => {
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
        if (error.response.status === 401) {
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

export const getMarktondernemers = (): Promise<MMSollicitatieStandalone[]> =>
    apiBase('koopman/').then(response => response.data);

export const getMarktondernemer = (
    erkenningsNummer: string
): Promise<MMOndernemerStandalone> => {
    return apiBase(`koopman/erkenningsnummer/${erkenningsNummer}`)
    .then(response => {
        if (!response || !response.data) {
            return Promise.reject(Error('Ondernemer niet gevonden'));
        }

        // Filter inactieve sollicitaties, aangezien we die nooit gebruiken binnen
        // dit systeem.
        const ondernemer = response.data;
        ondernemer.sollicitaties = ondernemer.sollicitaties.filter(sollicitatie =>
            !sollicitatie.doorgehaald
        );
        return ondernemer;
    });
};

export const getMarkt = (marktId: string): Promise<MMMarkt> =>
    apiBase(`markt/${marktId}`).then(response => response.data);

export const getMarkten = (): Promise<MMMarkt[]> =>
    apiBase('markt/').then(response => response.data);

export const getSollicitatiesByOndernemer = (erkenningsNummer: string): Promise<MMSollicitatie[]> => {
    return Promise.all([
        getMarktondernemer(erkenningsNummer),
        getMarkten(),
    ])
    .then(([ondernemer, markten]) => {
        const fases = ['activatie','wenperiode','live'];
        const marktenActief = markten.filter(markt => fases.includes(markt.kiesJeKraamFase))
                                     .map(markt => markt.id);

        return ondernemer.sollicitaties.filter(sollicitatie =>
            !sollicitatie.doorgehaald &&
            marktenActief.includes(sollicitatie.markt.id)
        );
    });
};

export const getMarktondernemersByMarkt = (marktId: string): Promise<MMSollicitatieStandalone[]> => {
    const recursiveCall = ((p: number, total: any[]): any => {

        return new Promise((resolve) => {
            apiBase(`sollicitaties/markt/${marktId}?listOffset=${p}&includeDoorgehaald=0`).then(response => {
                if (response.data.length > 0) {

                    return resolve(recursiveCall(p + 100, [...total, ...response.data]));
                } else {

                    return resolve(total);
                }
            });

        });
    });

    return recursiveCall(0, []);
};

export const getALijst = (marktId: string, marktDate: string): Promise<MMOndernemer[]> => {
    const day = new Date(marktDate).getDay();

    if (A_LIJST_DAYS.includes(day)) {
        const monday = addDays(marktDate, MONDAY - day),
            thursday = addDays(marktDate, THURSDAY - day);

        return apiBase(`rapport/aanwezigheid/${marktId}/${monday}/${thursday}`).then(response => response.data);
    } else {
        return new Promise(resolve => resolve([]));
    }
};

export const checkActivationCode = (username: string, code: string): Promise<any> =>
    getMarktondernemer(username).then(
        ondernemer => {
            if (!ondernemer.pasUid) {
                // This method of activation only works for people with a `pasUid`
                throw new Error('Incorrect username/password');
            } else {
                // Return Boolean please
                return typeof code === 'string' && code.length > 0 && code === ondernemer.pasUid;
            }
        },
        (err: Error) => {
            console.log(err);
            throw new Error('Incorrect username/password');
        },
    );

export const checkLogin = (): Promise<any> => {
    const api = getApi();
    return login(api).then((res: AxiosResponse) =>
        console.log('Login OK'),
    );
};
