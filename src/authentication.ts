import Keycloak from 'keycloak-connect';
import Pool from 'pg-pool';
import session from 'express-session';
import url from 'url';

const connectPgSimple = require('connect-pg-simple')(session);

const parseDatabaseURL = (str: string) => {
    const params = url.parse(str);
    const auth = params.auth.split(':');

    return {
        user: auth[0],
        password: auth[1],
        host: params.hostname,
        port: parseInt(params.port, 10),
        database: params.pathname.split('/')[1],
    };
};

export const Roles = {
    MARKTBUREAU: 'marktbureau',
    MARKTMEESTER: 'marktmeester',
    MARKTONDERNEMER: 'marktondernemer',
    MARKTBEWERKER: 'marktbewerker',
};

const sessionStore = new connectPgSimple({
    pool: new Pool(parseDatabaseURL(process.env.DATABASE_URL))
});

export const keycloak = new Keycloak({
    store: sessionStore
}, {
    realm: process.env.IAM_REALM,
    'auth-server-url': process.env.IAM_URL,
    'ssl-required': 'external',
    resource: process.env.IAM_CLIENT_ID,
    credentials: {
        secret: process.env.IAM_CLIENT_SECRET,
    },
    'confidential-port': 0,
});

export const sessionMiddleware = () =>
    session({
        store: sessionStore,
        secret: process.env.APP_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            sameSite: true
        }
    });
