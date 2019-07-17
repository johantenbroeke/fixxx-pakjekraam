import * as React from 'react';
import EmailIndeling from './views/EmailIndeling.jsx';
import { defer } from 'rxjs';
import { shareReplay, tap, combineLatest } from 'rxjs/operators';
import { mail } from './mail.js';
import { requireEnv, today } from './util';
import { getMarkten } from './makkelijkemarkt-api';
import {
    getAanmeldingen,
    getAllBranches,
    getMarktplaatsen,
    getMarktondernemersByMarkt,
    getPlaatsvoorkeuren,
    getToewijzingen,
} from './pakjekraam-api';
import { retry } from './rxjs-util';
import { getAllUsers } from './keycloak-api';
import { readOnlyLogin } from './makkelijkemarkt-auth';

requireEnv('MAILER_FROM');

const marktDate = today();

const users$ = defer(() => getAllUsers()).pipe(
    tap(() => console.log('Keycloak OK!'), () => console.log('Unable to connect to Keycloak')),
    retry(10, 5000),
    shareReplay(1),
);

const makkelijkeMarkt$ = defer(() => readOnlyLogin()).pipe(
    tap(
        () => console.log('Makkelijke Markt API OK!'),
        () => console.log('Unable to connect to the Makkelijke Markt API'),
    ),
    retry(10, 5000),
    shareReplay(1),
);

makkelijkeMarkt$.pipe(combineLatest(users$)).subscribe(([makkelijkeMarkt, users]) =>
    getMarkten(makkelijkeMarkt.token).then(markten =>
        markten
            .filter(markt => markt.id === 20)
            .map(markt =>
                Promise.all([
                    getMarktondernemersByMarkt(makkelijkeMarkt.token, String(markt.id)),
                    getToewijzingen(String(markt.id), marktDate),
                    getPlaatsvoorkeuren(String(markt.id)),
                    getAanmeldingen(String(markt.id), marktDate),
                    getMarktplaatsen(String(markt.id)),
                    getAllBranches(),
                ]).then(([ondernemers, toewijzingen, plaatsvoorkeuren, aanmeldingen, marktplaatsen, branches]) => {
                    console.log(`Verstuur mails voor de marktindeling van ${markt.id} op datum ${marktDate}`);
                    console.log('Marktondernemers', ondernemers ? ondernemers.length : 0);
                    console.log('Toewijzingen', toewijzingen ? toewijzingen.length : 0);

                    const registeredUsers = users
                        .filter(({ username }) =>
                            ondernemers.some(({ erkenningsNummer }) => erkenningsNummer === username),
                        )
                        .filter(user => !!user.email);

                    console.log(
                        'Geregistreerde marktondernemers met e-mail',
                        registeredUsers ? registeredUsers.length : 0,
                    );

                    toewijzingen
                        .map(toewijzing => {
                            const ondernemer = ondernemers.find(
                                ({ erkenningsNummer }) => erkenningsNummer === toewijzing.erkenningsNummer,
                            );
                            const user = users.find(({ username }) => username === toewijzing.erkenningsNummer);

                            return {
                                toewijzing,
                                ondernemer,
                                user,
                            };
                        })
                        .filter(({ user }) => !!user && !!user.email)
                        .map(({ ondernemer, user, toewijzing }) => {
                            const props = {
                                markt,
                                marktplaatsen,
                                marktDate,
                                ondernemer,
                                voorkeuren: plaatsvoorkeuren,
                                aanmeldingen,
                                branches,
                                toewijzing,
                            };

                            console.log(
                                `Stuur e-mail naar ${user.email}! Ondernemer is ingedeeld op plaats ${
                                    toewijzing.plaatsen
                                }`,
                            );

                            const subject = `${markt.naam} indeling voor ${marktDate}`;

                            console.log(subject);

                            const testEmail = {
                                from: process.env.MAILER_FROM,
                                to: user.email,
                                subject,
                                react: <EmailIndeling {...props} />,
                            };

                            mail(testEmail).then(
                                () => {
                                    console.log('E-mail is verstuurd.');
                                    process.exit(0);
                                },
                                (err: Error) => {
                                    console.error('E-mail sturen mislukt.', err);
                                    process.exit(1);
                                },
                            );
                        });
                }),
            ),
    ),
);
