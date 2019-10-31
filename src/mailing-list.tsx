import * as React from 'react';

import { EmailWenperiode } from './views/components/email/EmailWenperiode';
import { EmailToewijzing } from './views/components/email/EmailToewijzing';
import { EmailAfwijzing } from './views/components/email/EmailAfwijzing';

import { defer } from 'rxjs';
import { shareReplay, tap, combineLatest } from 'rxjs/operators';
import { mail } from './mail.js';
import { requireEnv, tomorrow, yyyyMmDdtoDDMMYYYY } from './util';
import { getMarktenByDate, getMarktondernemersByMarkt, getToewijzingen } from './pakjekraam-api';
import { getAfwijzingen } from './model/afwijzing.functions';
import { retry } from './rxjs-util';
import { getAllUsers } from './keycloak-api';
import { checkLogin } from './makkelijkemarkt-api';
// import { getMarktInfo } from './pakjekraam-api';
// import { IMarktplaats, IPlaatsvoorkeur, IRSVP, IBranche } from 'markt.model';
import { MMMarkt } from 'makkelijkemarkt.model';
import { getMarktEnriched } from './model/markt.functions';

requireEnv('MAILER_FROM');

const marktDate = tomorrow();

const users$ = defer(() => getAllUsers()).pipe(
    tap(() => console.log('Keycloak OK!'), (e) => console.log(`Unable to connect to Keycloak: ${e}`)),
    retry(10, 5000),
    shareReplay(1),
);

const mailToewijzingen = (
    toewijzingen: any[],
    markt: MMMarkt,
    marktEnriched: any,
) => {

    toewijzingen
        .map(({ ondernemer, user, toewijzing }) => {

            console.log(
                `Stuur e-mail naar ${user.email}! Ondernemer is ingedeeld op plaats ${ toewijzing.plaatsen }`,
            );

            const formattedMarkDate = yyyyMmDdtoDDMMYYYY(marktDate);

            let mailTemplate = null;
            let subject = null;
            switch (marktEnriched.fase) {
                case 'voorbereiding':
                    mailTemplate = null;
                    break;
                case 'activatie':
                    mailTemplate = null;
                    break;
                case 'wenperiode':
                    subject = `Indeling ${formattedMarkDate} ${markt.naam}`,
                    mailTemplate = <EmailWenperiode subject={subject} ondernemer={ondernemer} telefoonnummer={marktEnriched.marktEnriched} />;
                    break;
                case 'live':
                    subject = `Toewijzing ${formattedMarkDate} ${markt.naam}`,
                    mailTemplate = <EmailToewijzing
                        subject={subject}
                        ondernemer={ondernemer}
                        telefoonnummer={marktEnriched.telefoonnummer}
                        toewijzing={toewijzing}
                        marktDate={toewijzing.marktDate}
                        markt={markt}
                    />;
                break;
                default:
                    throw new Error('Fase markt not set, quiting mail script');
            }

            if (mailTemplate) {

                const mailObj = {
                    from: process.env.MAILER_FROM,
                    to: user.email,
                    subject,
                    react: mailTemplate,
                };

                mail(mailObj).then(
                    () => {
                        console.log(`E-mail is verstuurd naar ${user.email}.`);
                        process.exit(0);
                    },
                    (err: Error) => {
                        console.error('E-mail sturen mislukt.', err);
                        process.exit(1);
                    },
                ).catch((e: any) => {
                    console.log(e);
                });
            }


        });
};

const mailAfwijzingen = (
    afwijzingen: any[],
    markt: MMMarkt,
    marktEnriched: any,
) => {

    afwijzingen
        .map(({ ondernemer, user, afwijzing }) => {

            const formattedMarkDate = yyyyMmDdtoDDMMYYYY(marktDate);

            let mailTemplate = null;
            let subject = null;

            switch (marktEnriched.fase) {
                case 'voorbereiding':
                    mailTemplate = null;
                    break;
                case 'activatie':
                    mailTemplate = null;
                    break;
                case 'wenperiode':
                    subject = `Indeling ${formattedMarkDate} ${markt.naam}`,
                    mailTemplate = <EmailWenperiode subject={subject} ondernemer={ondernemer} telefoonnummer={marktEnriched.marktEnriched} />;
                    break;
                case 'live':
                    subject = `Niet ingedeeld ${formattedMarkDate} ${markt.naam}`,
                    mailTemplate = <EmailAfwijzing
                        subject={subject}
                        ondernemer={ondernemer}
                        telefoonnummer={marktEnriched.marktEnriched}
                        afwijzing={afwijzing}
                        markt={markt}
                    />;
                    break;
                default:
                    throw new Error('Fase markt not set, quiting mail script');
            }

            if (mailTemplate) {

                const mailObj = {
                    from: process.env.MAILER_FROM,
                    to: user.email,
                    subject,
                    react: mailTemplate,
                };

                mail(mailObj).then(
                    () => {
                        console.log(`E-mail is verstuurd naar ${user.email}.`);
                        process.exit(0);
                    },
                    (err: Error) => {
                        console.error('E-mail sturen mislukt.', err);
                        process.exit(1);
                    },
                    ).catch((e: any) => {
                        console.log(e);
                    });
            }
        });
};

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
            .filter(markt => markt.id === 20)
            .map(markt =>
                Promise.all([
                    getMarktondernemersByMarkt(String(markt.id)),
                    getToewijzingen(String(markt.id), marktDate),
                    getAfwijzingen(String(markt.id), marktDate),
                    getMarktEnriched(String(markt.id)),
                ]).then(([
                    ondernemers,
                    toewijzingen,
                    afwijzingen,
                    marktEnriched
                ]) => {

                    console.log(`Verstuur mails voor de marktindeling van ${markt.id} op datum ${marktDate}`);
                    console.log('Marktondernemers', ondernemers ? ondernemers.length : 0);
                    console.log('Toewijzingen', toewijzingen ? toewijzingen.length : 0);
                    console.log('Afwijzingen', afwijzingen ? afwijzingen.length : 0);

                    const toewijzingenFiltered = toewijzingen
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

                    const afwijzingenFiltered = afwijzingen
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

                    mailToewijzingen([toewijzingenFiltered[0]], markt, marktEnriched);
                    mailAfwijzingen([afwijzingenFiltered[0]], markt, marktEnriched);

                }),
            );
    });
});

