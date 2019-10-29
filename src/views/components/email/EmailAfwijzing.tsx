// import PropTypes, { ValidationMap } from 'prop-types';
import * as React from 'react';
import EmailBase from '../EmailBase.jsx';
import EmailTable from '../EmailTable.jsx';
import EmailContent from '../EmailContent.jsx';
import { IMarktondernemer } from '../../../markt.model';
import { yyyyMmDdtoDDMMYYYY, formatDayOfWeek } from '../../../util';
import { MMMarkt } from 'makkelijkemarkt.model';
import { getAfwijzingReason } from '../../../model/afwijzing.functions';

export type EmailIndelingProps = {
    ondernemer: IMarktondernemer;
    subject: string;
    telefoonnummer: string;
    afwijzing: any;
    markt: MMMarkt;
};

export class EmailAfwijzing extends React.Component<EmailIndelingProps> {

    public render() {

        const { subject, ondernemer, markt, afwijzing } = this.props;

        // const infoLink = 'https://www.amsterdam.nl/ondernemen/markt-straathandel/digitaal-indelen-plein-40-45/';

        const reason = getAfwijzingReason(afwijzing.reasonCode);

        const tableData = [
            ['Markt:', <strong key="markt">{markt.naam}</strong>],
            ['Reden:', <strong key="markt">{reason.message}</strong>],
        ];

        const formattedDate = yyyyMmDdtoDDMMYYYY(afwijzing.marktDate);
        const dayOfTheWeek = formatDayOfWeek(afwijzing.marktDate);

        return (
            <EmailBase lang="nl" appName="Kies je kraam" domain="kiesjekraam.amsterdam.nl" subject={subject}>
                <EmailContent>
                    <p>Beste {ondernemer.description},</p>
                    <p>Op {dayOfTheWeek} {formattedDate} bent u NIET ingedeeld op de markt.</p>
                    <EmailTable data={tableData} />
                    <p>Omdat u zich wel digitaal heeft aangemeld, maar niet bent ingedeeld, mag u eerder een plek kiezen bij de dagelijkse indeling door de marktmeester om 09.00 uur. Hiervoor dient u zich te melden bij de marktmeester vóór 8.45 uur. U kunt dan kiezen uit de overgebleven plekken.</p>
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

export default EmailAfwijzing;
