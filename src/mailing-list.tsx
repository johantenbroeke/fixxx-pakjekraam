import * as React from 'react';

import { EmailWenperiode } from './views/components/email/EmailWenperiode';
import { EmailToewijzing } from './views/components/email/EmailToewijzing';
import { EmailAfwijzing } from './views/components/email/EmailAfwijzing';
import { EmailDataUitslag } from './views/components/email/EmailDataUitslag';

import { defer } from 'rxjs';
import { shareReplay, tap, combineLatest } from 'rxjs/operators';
import { mail } from './mail.js';
import { requireEnv, yyyyMmDdtoDDMMYYYY, getTimezoneTime } from './util';
import { INDELING_DAG_OFFSET } from './domain-knowledge.js';
import { getMarktondernemersByMarkt, getToewijzingen } from './pakjekraam-api';
import { getAfwijzingen } from './model/afwijzing.functions';
import { retry } from './rxjs-util';
import { getAllUsers } from './keycloak-api';
import { checkLogin } from './makkelijkemarkt-api';
import { getMarktenByDate } from './model/markt.functions';
import { MMMarkt } from 'makkelijkemarkt.model';

requireEnv('MAILER_FROM');

const timezoneTime = getTimezoneTime();
timezoneTime.add(INDELING_DAG_OFFSET, 'days');
const marktDate = timezoneTime.format('YYYY-MM-DD');

const alternativeEmail = 'kiesjekraam@gmail.com';

const sendAllocationMail = (subject: string, mailTemplate: JSX.Element, emailaddress: string) => {
    return mail({
        from: process.env.MAILER_FROM,
        to: (process.env.APP_ENV === 'acceptance') || (process.env.APP_ENV === 'development') ? alternativeEmail : emailaddress,
        subject,
        react: mailTemplate,
    });
};

const mailToewijzing = (toewijzingenCombined: any, markt: MMMarkt) => {

    const { ondernemer, user, toewijzing } = toewijzingenCombined;

    console.log(`Stuur e-mail naar ${user.email} Ondernemer is ingedeeld op plaats ${ toewijzing.plaatsen }`);

    let mailTemplate = null;
    let subject = null;

    if (markt.kiesJeKraamFase === 'wenperiode') {
        subject = `Indeling ${yyyyMmDdtoDDMMYYYY(marktDate)} ${markt.naam}`;
        mailTemplate = <EmailWenperiode subject={subject} ondernemer={ondernemer} telefoonnummer={markt.telefoonNummerContact} />;
    }

    if (markt.kiesJeKraamFase === 'live' ) {
        subject = `Toewijzing ${yyyyMmDdtoDDMMYYYY(marktDate)} ${markt.naam}`;
        mailTemplate = <EmailToewijzing
            subject={subject}
            ondernemer={ondernemer}
            telefoonnummer={markt.telefoonNummerContact}
            toewijzing={toewijzing}
            marktDate={toewijzing.marktDate}
            markt={markt}
        />;
    }

    return sendAllocationMail(subject, mailTemplate, user.email);

};


const mailAfwijzing = (afwijzingCombined: any, markt: MMMarkt) => {

    const { ondernemer, user, afwijzing } = afwijzingCombined;

    console.log(`Stuur e-mail naar ${user.email} Ondernemer is niet ingedeeld vanwege ${ afwijzing.reason }`);

    let mailTemplate = null;
    let subject = null;

    if (markt.kiesJeKraamFase === 'live') {
        subject = `Indeling ${yyyyMmDdtoDDMMYYYY(marktDate)} ${markt.naam}`;
        mailTemplate = <EmailWenperiode subject={subject} ondernemer={ondernemer} telefoonnummer={markt.telefoonNummerContact} />;
    }

    if (markt.kiesJeKraamFase === 'live') {
        subject = `Niet ingedeeld ${yyyyMmDdtoDDMMYYYY(marktDate)} ${markt.naam}`,
            mailTemplate = <EmailAfwijzing
                subject={subject}
                ondernemer={ondernemer}
                telefoonnummer={markt.telefoonNummerContact}
                afwijzing={afwijzing}
                markt={markt}
            />;
    }
    return sendAllocationMail(subject, mailTemplate, user.email);

};

const users$ = defer(() => getAllUsers()).pipe(
    tap(() => console.log('Keycloak OK!'), (e) => console.log(`Unable to connect to Keycloak: ${e}`)),
    retry(10, 5000),
    shareReplay(1),
);

const makkelijkeMarkt$ = defer(() => checkLogin()).pipe(
    tap(
        () => console.log('Makkelijke Markt API OK!'),
        () => console.log('Unable to connect to the Makkelijke Markt API'),
    ),
    retry(10, 5000),
    shareReplay(1),
);

makkelijkeMarkt$.pipe(combineLatest(users$)).subscribe(([makkelijkeMarkt, users]) => {

    return getMarktenByDate(marktDate).then(markten => {

        return markten
            .filter(markt => markt.kiesJeKraamFase)
            .filter(markt => markt.kiesJeKraamFase === 'live' || markt.kiesJeKraamFase === 'wenperiode')
            .map(markt =>
                Promise.all([
                    getMarktondernemersByMarkt(String(markt.id)),
                    getToewijzingen(String(markt.id), marktDate),
                    getAfwijzingen(String(markt.id), marktDate),
                ]).then(([
                    ondernemers,
                    toewijzingen,
                    afwijzingen,
                ]) => {

                    console.log(`Verstuur mails voor de marktindeling van ${markt.id} op datum ${marktDate}`);
                    console.log('Marktondernemers', ondernemers ? ondernemers.length : 0);
                    console.log('Toewijzingen', toewijzingen ? toewijzingen.length : 0);
                    console.log('Afwijzingen', afwijzingen ? afwijzingen.length : 0);

                    const toewijzingenCombined = toewijzingen
                        .map(toewijzing => {
                            const ondernemer = ondernemers.find(
                                ({ erkenningsNummer }) => erkenningsNummer === toewijzing.erkenningsNummer,
                            );
                            const user = users.find(
                                ({ username }) => username === toewijzing.erkenningsNummer
                            );
                            return {
                                toewijzing,
                                ondernemer,
                                user,
                            };
                        })
                        .filter(({ user }) => !!user && !!user.email);

                    console.log('Toewijzingen combined', toewijzingenCombined ? toewijzingenCombined.length : 0);

                    const afwijzingenCombined = afwijzingen
                        .map(afwijzing => {
                            const ondernemer = ondernemers.find(
                                ({ erkenningsNummer }) => erkenningsNummer === afwijzing.erkenningsNummer,
                            );

                            const user = users.find(
                                ({ username }) => username === afwijzing.erkenningsNummer
                            );
                            return {
                                afwijzing,
                                ondernemer,
                                user,
                            };
                        })
                        .filter(({ user }) => !!user && !!user.email);

                    console.log('Afwijzingen combined', afwijzingenCombined ? afwijzingenCombined.length : 0);

                    const sendToewijzingen = Promise.all(toewijzingenCombined.map( toewijzingCombined => mailToewijzing(toewijzingCombined, markt ) ));
                    const sendAfwijzingen = Promise.all(afwijzingenCombined.map( afwijzingCombined => mailAfwijzing(afwijzingCombined, markt ) ));

                    return Promise.all([
                            sendToewijzingen,
                            sendAfwijzingen,
                            sendUitslag(markt, marktDate, toewijzingen, ondernemers, false),
                            markt.kiesJeKraamEmailKramenzetter ? sendUitslag(markt, marktDate, toewijzingen, ondernemers, true) : null,
                        ])
                        .then( result => {
                            console.log(`${result[0].length} toewijzingen verstuurd.`);
                            console.log(`${result[1].length} afwijzingen verstuurd.`);
                            console.log(`Resultaat versturen uitslag naar marktbureau: ${result[2].message}`);
                            console.log( markt.kiesJeKraamEmailKramenzetter ?
                                `Resultaat versturen uitslag naar kraamzetter: ${result[3].message}` :
                                'Geen emailadres kramenzetter in makkelijke markt'
                            );
                            process.exit(0);
                        });
                })
                .catch(e => {
                    console.log(e);
                })
            );
    });
});

function sendUitslag(markt: any, marktDate: string, toewijzingen: any[], ondernemers: any[], isKraamzetter: Boolean) {
    toewijzingen.sort( (a,b) => a.plaatsen[0] - b.plaatsen[0] );
    const subject = `${markt.naam} ${yyyyMmDdtoDDMMYYYY(marktDate)}`;
    const mailTemplate = <EmailDataUitslag
        subject={subject}
        toewijzingen={toewijzingen}
        ondernemers={ondernemers}
        marktDate={marktDate}
        markt={markt}
        isKraamzetter={isKraamzetter}
    />;
    let to = null;
    if (process.env.APP_ENV === 'production') {
        isKraamzetter ?
            to = markt.kiesJeKraamEmailKramenzetter:
            to = 'Marktbureau.kiesjekraam@amsterdam.nl,kiesjekraam@gmail.com';
    } else {
        to = alternativeEmail;
    }
    return mail({
        from: process.env.MAILER_FROM,
        to,
        subject,
        react: mailTemplate,
    });
}
