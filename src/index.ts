import express, {
    Request,
    Response,
    NextFunction
} from 'express';

import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import morgan from 'morgan';
import path from 'path';
import * as reactViews from 'express-react-views';

// Util
// ----

import {
    HTTP_INTERNAL_SERVER_ERROR,
    internalServerErrorPage,
    getQueryErrors,
    isAbsoluteUrl
} from './express-util';

import { requireEnv } from './util';

// Authentication
// --------------

import {
    GrantedRequest,
    TokenContent
} from 'keycloak-connect';
import { getKeycloakUser } from './keycloak-api';
import {
    Roles,
    keycloak,
    sessionMiddleware
} from './authentication';

// API
// ---

import {
    getMarkt,
    getMarkten
} from './makkelijkemarkt-api';

import {
    getMarktEnriched
} from './model/markt.functions';

// Routes
// ------

import {
    serverHealth,
    serverTime,
    databaseHealth,
    keycloakHealth,
    makkelijkeMarktHealth
} from './routes/status';

import {
    attendancePage,
    handleAttendanceUpdate
} from './routes/market-application';

import {
    marketPreferencesPage,
    updateMarketPreferences
} from './routes/market-preferences';

import {
    dashboardPage
} from './routes/dashboard';

import {
    plaatsvoorkeurenPage,
    updatePlaatsvoorkeuren
} from './routes/market-location';

import {
    deleteUserPage,
    deleteUser,
    publicProfilePage,
    toewijzingenAfwijzingenPage
} from './routes/ondernemer';

import {
    langdurigAfgemeld,
    marktDetail
} from './routes/markt';

import {
    uploadMarkten,
} from './routes/marktbewerker';

import {
    vasteplaatshoudersPage,
    voorrangslijstPage,
    ondernemersNietIngedeeldPage,
    afmeldingenVasteplaatshoudersPage,
    sollicitantentAanwezigheidLijst,
    alleOndernemersAanwezigheidLijst,
} from './routes/markt-marktmeester';

import {
    conceptIndelingPage,
    indelingPage
} from './routes/market-allocation';

const csrfProtection = csrf({ cookie: true });

requireEnv('DATABASE_URL');
requireEnv('APP_SECRET');

const HTTP_DEFAULT_PORT = 8080;

const isMarktondernemer = (req: GrantedRequest) => {
    const accessToken = req.kauth.grant.access_token.content;

    return (
        !!accessToken.resource_access[process.env.IAM_CLIENT_ID] &&
        accessToken.resource_access[process.env.IAM_CLIENT_ID].roles.includes(Roles.MARKTONDERNEMER)
    );
};

const isMarktmeester = (req: GrantedRequest) => {
    const accessToken = req.kauth.grant.access_token.content;

    return (
        !!accessToken.resource_access[process.env.IAM_CLIENT_ID] &&
        accessToken.resource_access[process.env.IAM_CLIENT_ID].roles.includes(Roles.MARKTMEESTER)
    );
};

const getErkenningsNummer = (req: GrantedRequest) => {
    const tokenContent = req.kauth.grant.access_token.content as TokenContent & any;
    return isMarktondernemer(req) && tokenContent.preferred_username.replace(/\./g, '');
};

const app = express();

// Trick `keycloak-connect` into thinking we're running on HTTPS
app.set('trust proxy', true);
// Initialize React JSX templates for server-side rendering
app.set('views', path.resolve(__dirname, 'views'));
app.set('view engine', 'jsx');
const templateEngine = reactViews.createEngine({ beautify: true });

app.engine('jsx', templateEngine);
app.engine('tsx', templateEngine);

app.use(morgan(':date[iso] :method :status :url :response-time ms'));

// The `/status/health` endpoint is required for Docker deployments
app.get('/status/health', serverHealth);
app.get('/status/time', serverTime);
app.get('/status/database', databaseHealth);
app.get('/status/keycloak', keycloakHealth);
app.get('/status/makkelijkemarkt', makkelijkeMarktHealth);

app.use((req, res, next) => {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('X-Frame-Options', 'SAMEORIGIN');
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files that are public (robots.txt, favicon.ico)
app.use(express.static('./dist/'));

app.use(sessionMiddleware());
app.use(keycloak.middleware({ logout: '/logout' }));

// Put the login route before the expired redirect to prevent an
// endless loop.
app.get('/login', keycloak.protect(), (req: GrantedRequest, res: Response) => {
    if (req.query.next) {
        // To prevent open redirects, filter out absolute URLS
        res.redirect(!isAbsoluteUrl(req.query.next) ? req.query.next : '/');
    } else if (isMarktondernemer(req)) {
        res.redirect('/dashboard/');
    } else if (isMarktmeester(req)) {
        res.redirect('/markt/');
    } else {
        res.redirect('/');
    }
});

app.get('/', (req: Request, res: Response) => {
    res.render('HomePage');
});

app.get('/email/', keycloak.protect(Roles.MARKTMEESTER), (req: Request, res: Response) => {
    res.render('EmailPage');
});

app.get(
    '/markt/',
    keycloak.protect(Roles.MARKTMEESTER),
    (req: GrantedRequest, res: Response) => {
        return getMarkten(true)
            .then((markten: any) => {
                res.render('MarktenPage',{ markten, role: Roles.MARKTMEESTER, user: getKeycloakUser(req) });
            }, internalServerErrorPage(res));
});

app.get(
    '/markt/:marktId/',
    keycloak.protect(Roles.MARKTMEESTER),
    (req: GrantedRequest, res: Response, next: NextFunction) => {
        getMarktEnriched(req.params.marktId)
        .then(markt => {
            res.render('MarktDetailPage', {
                role: Roles.MARKTMEESTER,
                user: getKeycloakUser(req),
                markt
            });
        })
        .catch(next);
    },
);

app.get(
    '/markt/:marktId/langdurig-afgemeld',
    keycloak.protect(Roles.MARKTMEESTER),
    (req: GrantedRequest, res: Response, next: NextFunction) =>
        langdurigAfgemeld(
            req,
            res,
            req.params.marktId,
            Roles.MARKTMEESTER,
        )
);

app.get(
    '/markt/:marktId/:marktDate/indelingslijst/',
    keycloak.protect(Roles.MARKTMEESTER),
    (req: GrantedRequest, res: Response, next: NextFunction) =>
        indelingPage(req, res, 'wenperiode')
);

app.get(
    '/markt/:marktId/:marktDate/indeling/',
    keycloak.protect(Roles.MARKTMEESTER),
    (req: GrantedRequest, res: Response, next: NextFunction) =>
        indelingPage(req, res, 'indeling')
);

app.get(
    '/markt/:marktId/:marktDate/concept-indelingslijst/',
    keycloak.protect(Roles.MARKTMEESTER),
    conceptIndelingPage,
);

app.get(
    '/markt/:marktId/:datum/vasteplaatshouders/',
    keycloak.protect(Roles.MARKTMEESTER),
    vasteplaatshoudersPage,
);

app.get(
    '/markt/:marktId/:datum/a-b-lijst/',
    keycloak.protect(Roles.MARKTMEESTER),
    voorrangslijstPage
);

app.get(
    '/markt/:marktId/:datum/ondernemers-niet-ingedeeld/',
    keycloak.protect(Roles.MARKTMEESTER),
    ondernemersNietIngedeeldPage
);

app.get('/markt/:marktId/:datum/voorrangslijst/',
    keycloak.protect(Roles.MARKTMEESTER),
    sollicitantentAanwezigheidLijst
);

app.get('/markt/:marktId/:datum/alle-sollicitanten/',
    keycloak.protect(Roles.MARKTMEESTER),
    sollicitantentAanwezigheidLijst
);

app.get('/markt/:marktId/:datum/alle-ondernemers/',
    keycloak.protect(Roles.MARKTMEESTER),
    alleOndernemersAanwezigheidLijst
);

app.get(
    '/markt/:marktId/:datum/afmeldingen-vasteplaatshouders/',
    keycloak.protect(Roles.MARKTMEESTER),
    afmeldingenVasteplaatshoudersPage
);

app.get(
    '/dashboard/',
    keycloak.protect(Roles.MARKTONDERNEMER),
    (req: GrantedRequest, res: Response, next: NextFunction) => {
        dashboardPage(req, res, next, getErkenningsNummer(req));
    },
);

// Registratie & Activatie
// -----------------------
const registrationAndActivation = require('./routes/registration')();
app.use(registrationAndActivation);

app.get(
    '/ondernemer/:erkenningsNummer/aanwezigheid/',
    keycloak.protect(Roles.MARKTMEESTER),
    csrfProtection,
    (req: GrantedRequest, res: Response, next: NextFunction) => {
        attendancePage(
            req, res, next,
            Roles.MARKTMEESTER,
            req.params.erkenningsNummer,
            req.csrfToken()
        );
    },
);

app.post(
    '/ondernemer/:erkenningsNummer/aanwezigheid/',
    keycloak.protect(Roles.MARKTMEESTER),
    csrfProtection,
    (req: GrantedRequest, res: Response, next: NextFunction) => {
        handleAttendanceUpdate(
            req, res, next,
            Roles.MARKTMEESTER,
            req.params.erkenningsNummer
        );
    }
);

app.get(
    '/aanwezigheid/',
    keycloak.protect(Roles.MARKTONDERNEMER),
    csrfProtection,
    (req: GrantedRequest, res: Response, next: NextFunction) => {
        attendancePage(
            req, res, next,
            Roles.MARKTONDERNEMER,
            getErkenningsNummer(req),
            req.csrfToken()
        );
    },
);

app.post(
    '/aanwezigheid/',
    keycloak.protect(Roles.MARKTONDERNEMER),
    csrfProtection,
    (req: GrantedRequest, res: Response, next: NextFunction) =>
        handleAttendanceUpdate(
            req, res, next,
            Roles.MARKTONDERNEMER,
            getErkenningsNummer(req)
        )
);

app.get(
    '/voorkeuren/:marktId/',
    keycloak.protect(Roles.MARKTONDERNEMER),
    csrfProtection,
    (req: GrantedRequest, res: Response) => {
        plaatsvoorkeurenPage(
            req,
            res,
            getErkenningsNummer(req),
            req.query,
            req.params.marktId,
            Roles.MARKTONDERNEMER,
            req.csrfToken(),
        );
    },
);

app.post(
    ['/voorkeuren/:marktId/'],
    keycloak.protect(Roles.MARKTONDERNEMER),
    csrfProtection,
    (req: GrantedRequest, res: Response, next: NextFunction) =>
        updatePlaatsvoorkeuren(
            req,
            res,
            next,
            req.params.marktId,
            getErkenningsNummer(req)
        )
);

app.get(
    '/ondernemer/:erkenningsNummer/voorkeuren/:marktId/',
    keycloak.protect(Roles.MARKTMEESTER),
    csrfProtection,
    (req: GrantedRequest, res: Response) => {
        plaatsvoorkeurenPage(
            req,
            res,
            req.params.erkenningsNummer,
            req.query,
            req.params.marktId,
            Roles.MARKTMEESTER,
            req.csrfToken(),
        );
    },
);

app.post(
    '/ondernemer/:erkenningsNummer/voorkeuren/:marktId/',
    keycloak.protect(Roles.MARKTMEESTER),
    csrfProtection,
    (req: Request, res: Response, next: NextFunction) =>
        updatePlaatsvoorkeuren(
            req,
            res,
            next,
            req.params.marktId,
            req.params.erkenningsNummer
        )
);

app.get(
    '/markt-detail/:marktId/',
    keycloak.protect(Roles.MARKTONDERNEMER),
    (req: GrantedRequest, res: Response, next: NextFunction) =>
        marktDetail(
            req,
            res,
            next,
            getErkenningsNummer(req),
            Roles.MARKTONDERNEMER
        )
);

app.get(
    '/ondernemer/:erkenningsNummer/markt-detail/:marktId/',
    keycloak.protect(Roles.MARKTMEESTER),
    (req: GrantedRequest, res: Response, next: NextFunction) =>
        marktDetail(
            req,
            res,
            next,
            req.params.erkenningsNummer,
            Roles.MARKTMEESTER,
        )
);

app.get(
    '/algemene-voorkeuren/:marktId/',
    keycloak.protect(Roles.MARKTONDERNEMER),
    csrfProtection,
    (req: GrantedRequest, res: Response) => {
        marketPreferencesPage(
            req,
            res,
            getErkenningsNummer(req),
            req.params.marktId,
            Roles.MARKTONDERNEMER,
            req.csrfToken(),
        );
    },
);

app.post(
    '/algemene-voorkeuren/:marktId/',
    keycloak.protect(Roles.MARKTONDERNEMER),
    csrfProtection,
    (req: GrantedRequest, res: Response, next: NextFunction) =>
        updateMarketPreferences(
            req,
            res,
            next,
            getErkenningsNummer(req),
            Roles.MARKTONDERNEMER
        ),
);

app.get(
    '/verwijder-ondernemer/',
    keycloak.protect(Roles.MARKTMEESTER),
    csrfProtection,
    (req: GrantedRequest, res: Response) => {
        if (!req.url.endsWith('/')) {
            res.redirect(301, `${req.url}/`);
        } else {
            deleteUserPage(
                req,
                res,
                null,
                null,
                req.csrfToken(),
                Roles.MARKTMEESTER,
            );
        }
    },
);

app.post(
    '/verwijder-ondernemer/',
    keycloak.protect(Roles.MARKTMEESTER),
    csrfProtection,
    (req: GrantedRequest, res: Response) => {
        deleteUser(
            req,
            res,
            req.body.erkenningsNummer
        );
    },
);

app.get(
    '/ondernemer/:erkenningsNummer/algemene-voorkeuren/:marktId/',
    keycloak.protect(Roles.MARKTMEESTER),
    csrfProtection,
    (req: GrantedRequest, res: Response) => {
        marketPreferencesPage(
            req,
            res,
            req.params.erkenningsNummer,
            req.params.marktId,
            Roles.MARKTMEESTER,
            req.csrfToken(),
        );
    },
);

app.post(
    '/ondernemer/:erkenningsNummer/algemene-voorkeuren/:marktId/',
    keycloak.protect(Roles.MARKTMEESTER),
    csrfProtection,
    (req: Request, res: Response, next: NextFunction) =>
        updateMarketPreferences(
            req,
            res,
            next,
            req.params.erkenningsNummer,
            Roles.MARKTMEESTER,
        ),
);

app.get(
    '/profile/:erkenningsNummer',
    keycloak.protect(Roles.MARKTMEESTER),
    (req: GrantedRequest, res: Response) =>
        publicProfilePage(
            req,
            res,
            req.params.erkenningsNummer,
            Roles.MARKTMEESTER,
        )
);

app.get(
    '/ondernemer/:erkenningsNummer/toewijzingen-afwijzingen/',
    keycloak.protect(Roles.MARKTMEESTER),
    (req: GrantedRequest, res: Response) =>
        toewijzingenAfwijzingenPage(
            req,
            res,
            req.params.erkenningsNummer,
            Roles.MARKTMEESTER
        )
);

app.get(
    '/toewijzingen-afwijzingen/',
    keycloak.protect(Roles.MARKTONDERNEMER),
    (req: GrantedRequest, res: Response) =>
        toewijzingenAfwijzingenPage(
            req,
            res,
            getErkenningsNummer(req),
            Roles.MARKTONDERNEMER
        )
);


app.get(
    '/upload-markten/',
    // keycloak.protect(Roles.MARKTBEWERKER),
    (req: GrantedRequest, res: Response) =>
        uploadMarkten(
            req,
            res,
            Roles.MARKTBEWERKER,
        )
);


app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (process.env.APP_ENV === 'production') {
        res.render('ErrorPage', { errorCode: 500, req });
    } else {
        res.render('ErrorPage', { message: err.message, stack: err.stack, errorCode: 500, req });
    }
});

const port = process.env.PORT || HTTP_DEFAULT_PORT;

app.listen(port, (err: Error | null) => {
    if (err) {
        console.error(err);
    } else {
        console.log(`Listening on port ${port}`);
    }
});
