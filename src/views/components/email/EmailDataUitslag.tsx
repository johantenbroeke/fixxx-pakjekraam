import * as React from 'react';
import EmailBase from '../EmailBase.jsx';
import EmailContent from '../EmailContent.jsx';

import { yyyyMmDdtoDDMMYYYY } from '../../../util';

import {
    IMarkt,
} from '../../../markt.model';

export type Properties = {
    markt: IMarkt;
    toewijzingen: any[];
    ondernemers: any[];
    marktDate: string;
    subject: string;
};

export class EmailDataUitslag extends React.Component<Properties> {

    public render() {
        const { subject, toewijzingen, ondernemers, markt, marktDate } = this.props as Properties;
        return (
            <EmailBase lang="nl" appName="Kies je kraam" domain="kiesjekraam.amsterdam.nl" subject={subject}>

                <EmailContent>
                    <p>Beste marktbeheerder,</p>
                    <p>Dit is een automatische mail met de indeling van {markt.naam} op {yyyyMmDdtoDDMMYYYY(marktDate)}.</p>
                    <table className="uitslag-table">
                        <tr text-align="left">
                            <th>Plaats(en)</th>
                            <th>Soll nr.</th>
                            <th>Naam</th>
                            <th>Type</th>
                        </tr>
                        <tbody>
                            {toewijzingen.map((toewijzing, index) => {
                                const ondernemer = ondernemers.find(ondernemer => ondernemer.erkenningsNummer === toewijzing.erkenningsNummer);
                                return (
                                    <tr key={index}>
                                        <td>{toewijzing.plaatsen.sort((a: any, b: any) => a - b).join(', ')}</td>
                                        <td>{ondernemer.sollicitatieNummer}</td>
                                        <td>{ondernemer.description}</td>
                                        <td>{ondernemer.status}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <p>Met vriendelijke groet,<br />Marktbureau Amsterdam</p>
                </EmailContent>
            </EmailBase>
        );
    }
}

export default EmailDataUitslag;
