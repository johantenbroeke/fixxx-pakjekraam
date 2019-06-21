const models = require('./model/index.js');
const { requireAuthorization } = require('./makkelijkemarkt-auth.js');
const { login, getMarkten, getMarktondernemersByMarkt } = require('./makkelijkemarkt-api.js');
const { flatten } = require('./util.js');
const { formatOndernemerName } = require('./domain-knowledge.js');
const packageJSON = require('../package.json');

login({
    username: process.env.API_READONLY_USER,
    password: process.env.API_READONLY_PASS,
    url: process.env.API_URL,
    appKey: process.env.API_MMAPPKEY,
    clientApp: packageJSON.name,
    clientVersion: packageJSON.version,
}).then(session => {
    const token = session.uuid;

    const markten = getMarkten(token);

    const marktData = markten.then(markten => {
        return markten.map(markt => {
            return {
                marktId: markt.id,
                title: markt.naam,
                monday: markt.marktDagen.includes('ma'),
                tuesday: markt.marktDagen.includes('di'),
                wednesday: markt.marktDagen.includes('wo'),
                thursday: markt.marktDagen.includes('do'),
                friday: markt.marktDagen.includes('vr'),
                saturday: markt.marktDagen.includes('za'),
                sunday: markt.marktDagen.includes('zo'),
            };
        });
    });

    const sollicitaties = markten
        .then(markten => Promise.all(markten.map(markt => getMarktondernemersByMarkt(token, markt.id))))
        .then(items => items.reduce(flatten, []));

    const ondernemers = sollicitaties.then(items =>
        items.reduce((arr, item) => {
            return arr.find(({ koopman: { erkenningsnummer } }) => erkenningsnummer === item.koopman.erkenningsnummer)
                ? arr
                : [...arr, item];
        }, []),
    );

    const ondernemerData = ondernemers.then(ondernemers => {
        console.log(`${ondernemers.length} ondernemers gevonden`);
        return ondernemers.map(data => ({
            erkenningsNummer: data.koopman.erkenningsnummer,
            name: formatOndernemerName(data.koopman),
            account: null,
            inactive: data.koopman.status !== 'Actief',
        }));

        // return models.ondernemer.bulkCreate(rows);
    });

    const sollicitatieData = sollicitaties.then(ondernemers => {
        console.log(`${ondernemers.length} sollicitaties gevonden`);
        return ondernemers.map(data => ({
            marktId: data.markt.id,
            erkenningsNummer: data.koopman.erkenningsnummer,
            sollicitatieNummer: data.sollicitatieNummer,
            status: data.status,
            plaatsIds: data.vastePlaatsen,
            inactive: data.doorgehaald,
        }));
    });

    models.sequelize
        .transaction(transaction =>
            Promise.all([
                models.markt.destroy({ transaction, truncate: true }),
                models.ondernemer.destroy({ transaction, truncate: true }),
                models.sollicitatie.destroy({ transaction, truncate: true }),
            ]).then(() =>
                Promise.all([
                    marktData.then(rows => models.markt.bulkCreate(rows, { validate: true, transaction })),
                    ondernemerData.then(rows => models.ondernemer.bulkCreate(rows, { validate: true, transaction })),
                    sollicitatieData.then(rows =>
                        models.sollicitatie.bulkCreate(rows, { validate: true, transaction }),
                    ),
                ]).then(affectedRows => affectedRows.reduce(flatten, [])),
            ),
        )
        .then(
            affectedRows => {
                console.log(`Import succeeded. ${affectedRows.length} entries imported.`);
                process.exit(0);
            },
            err => {
                console.log('Import failed.');
                console.error(err);
                process.exit(1);
            },
        );
});
