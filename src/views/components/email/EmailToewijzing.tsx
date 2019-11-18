// import PropTypes, { ValidationMap } from 'prop-types';
import * as React from 'react';
import EmailBase from '../EmailBase.jsx';
import EmailTable from '../EmailTable.jsx';
import EmailContent from '../EmailContent.jsx';
import { IMarktondernemer, IToewijzing } from '../../../markt.model';
import { yyyyMmDdtoDDMMYYYY, formatDayOfWeek } from '../../../util';
import { MMMarkt } from 'makkelijkemarkt.model';


export type EmailIndelingProps = {
    ondernemer: IMarktondernemer;
    subject: string;
    telefoonnummer: string;
    marktDate: string;
    toewijzing: IToewijzing;
    markt: MMMarkt;
};

export class EmailToewijzing extends React.Component<EmailIndelingProps> {

    public render() {

        const { subject, ondernemer, telefoonnummer, marktDate, toewijzing, markt } = this.props;

        // const infoLink = 'https://www.amsterdam.nl/ondernemen/markt-straathandel/digitaal-indelen-plein-40-45/';

        const formattedDate = yyyyMmDdtoDDMMYYYY(marktDate);
        const dayOfTheWeek = formatDayOfWeek(marktDate);

        const plaatsen = toewijzing.plaatsen.sort((a: any, b: any) => a - b).join(', ');

        const tableData = [
            ['Markt:', <strong key="markt">{markt.naam}</strong>],
            ['Plaats(en):', <strong key="markt">{plaatsen}</strong>],
        ];

        return (
            <EmailBase lang="nl" appName="Kies je kraam" domain="kiesjekraam.amsterdam.nl" subject={subject}>
                <EmailContent>
                    <p>Beste {ondernemer.description},</p>
                    <p>Op {dayOfTheWeek} {formattedDate} bent u ingedeeld op de markt.</p>
                    <EmailTable data={tableData} />
                    <p>Als u onverwachts toch niet kunt komen verzoeken wij u dit uiterlijk 08.45 uur aan de marktmeester te melden zodat een andere ondernemer uw plaats kan krijgen.</p>
                    <p>Dit kan telefonisch via: {telefoonnummer}.</p>
                    <p>Alleen als er sprake is van overmacht hoeft u het marktgeld niet te betalen. Overmacht betekent dat u de avond van tevoren nog niet kon weten dat u niet naar de markt kunt komen. De marktmeester beoordeelt uw situatie.</p>
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

export default EmailToewijzing;
