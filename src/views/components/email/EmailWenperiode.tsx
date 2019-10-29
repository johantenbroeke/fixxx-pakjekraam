// import PropTypes, { ValidationMap } from 'prop-types';
import * as React from 'react';
import EmailBase from '../EmailBase.jsx';
import EmailContent from '../EmailContent.jsx';

import { IMarktondernemer } from '../../../markt.model';

export type EmailIndelingProps = {
    ondernemer: IMarktondernemer;
    subject: string;
    telefoonnummer: string;
};

export class EmailWenperiode extends React.Component<EmailIndelingProps> {

    public render() {
        const { ondernemer, subject, telefoonnummer } = this.props;

        const infoLink = 'https://www.amsterdam.nl/ondernemen/markt-straathandel/digitaal-indelen-plein-40-45/';

        return (
            <EmailBase lang="nl" appName="Kies je kraam" domain="kiesjekraam.amsterdam.nl" subject={subject}>
                <EmailContent>
                    <p>Beste {ondernemer.description},</p>
                    <p>
                        Dit is een testmail tijdens de wenperiode van digitaal indelen. U ontvangt deze e-mail omdat
                        u zich digitaal heeft aangemeld.
                    </p>
                    <p>In de toekomst ontvangt u in deze mail uw (toegewezen) plaatsnummers.</p>
                    <p>
                        De loting en de indeling verloopt zoals u nu gewend bent.
                        <br />
                        Er verandert verder niets tijdens de wenperiode.
                    </p>
                    <p>
                        <strong>Meer informatie?</strong>
                        <br />
                        Op deze <a href={infoLink} target="_blank">website</a> kunt u veel informatie vinden over digitaal indelen.
                        Wij raden u aan dit te lezen als u wilt weten hoe het precies werkt.
                    </p>
                    <p>
                        Hebt u daarna nog vragen? Stuur ons dan een e-mail via{' '}
                        <a href="mailto: marktbureau@amsterdam.nl">marktbureau@amsterdam.nl</a> of bel ons via {telefoonnummer}.
                    </p>
                    <p>
                        Met vriendelijke groet,
                        <br />
                        Marktbureau Amsterdam
                    </p>
                </EmailContent>
            </EmailBase>
        );
    }
}

export default EmailWenperiode;
