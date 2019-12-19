import * as React from 'react';
import PropTypes, { ValidationMap } from 'prop-types';
import MarktDetailBase from './components/MarktDetailBase';
import { ondernemersToLocatieKeyValue, obstakelsToLocatieKeyValue } from '../domain-knowledge.js';
import { arrayToObject, getBreadcrumbsMarkt } from '../util';
import IndelingslijstGroup from './components/IndelingslijstGroup';
import PrintPage from './components/PrintPage';
import Street from './components/Street';
import { IRSVP, IMarktplaats, IMarktondernemer, IToewijzing, IMarkt, IObstakelBetween, IMarktondernemerVoorkeur, IBranche } from '../markt.model';
import { IAllocationPrintout } from '../model/printout.model';

export type IndelingslijstenPageState = {
    aanmeldingen: IRSVP[];
    obstakels: IObstakelBetween[];
    marktplaatsen: IMarktplaats[];
    ondernemers: IMarktondernemer[];
    paginas: IAllocationPrintout;
    toewijzingen: IToewijzing[];
    markt: IMarkt;
    plaatsvoorkeuren: any[];
    voorkeuren: IMarktondernemerVoorkeur[];
    marktId: string;
    datum: string;
    type: string;
    branches: IBranche[];
    role: string;
};

export default class IndelingslijstenPage extends React.Component {

    public render() {

        const props = this.props as IndelingslijstenPageState;
        const { aanmeldingen, obstakels, marktplaatsen, ondernemers, paginas, markt, datum, type, voorkeuren, branches, role } = props;
        let { toewijzingen, plaatsvoorkeuren } = props;
        const plaatsList = arrayToObject(marktplaatsen, 'plaatsId');
        const vphl = ondernemersToLocatieKeyValue(ondernemers);
        const obstakelList = obstakelsToLocatieKeyValue(obstakels);

        const titleMap: { [index: string]: string } = {
            indelingslijst: 'Indelingslijst',
            indeling: 'Indeling',
            'concept-indelingslijst': 'Concept indelingslijst',
        };
        const title = titleMap[type] || titleMap['indelingslijst'];

        toewijzingen = type !== 'wenperiode' ? toewijzingen : [];

        plaatsvoorkeuren = plaatsvoorkeuren.reduce((t: any, voorkeur: any) => {
            if (!t[voorkeur.erkenningsNummer]) {
                t[voorkeur.erkenningsNummer] = [];
            }
            t[voorkeur.erkenningsNummer].push(voorkeur);
            return t;
        }, {});

        const breadcrumbs = getBreadcrumbsMarkt(markt, role);

        return (
            <MarktDetailBase
                bodyClass="page-markt-indelingslijst page-print"
                title={title}
                markt={markt}
                type={type}
                datum={datum}
                showDate={true}
                breadcrumbs={breadcrumbs}
                role={role}
            >
                {paginas.map((page, j) => (
                    <PrintPage
                        key={`page-${j}`}
                        index={j}
                        title={`${title} ${markt.naam}`}
                        label={page.title}
                        datum={datum}
                    >
                        {page.indelingslijstGroup.map((pageItem, i) => {
                            if (pageItem.type && pageItem.type === 'street') {
                                return <Street key={`page-street-${i}`} title={pageItem.title} />;
                            } else {
                                return (
                                        <IndelingslijstGroup
                                            key={`page-group-${i}`}
                                            page={pageItem}
                                            plaatsList={plaatsList}
                                            vphl={vphl}
                                            obstakelList={obstakelList}
                                            aanmeldingen={aanmeldingen}
                                            toewijzingen={toewijzingen}
                                            ondernemers={ondernemers}
                                            markt={markt}
                                            datum={datum}
                                            voorkeuren={voorkeuren}
                                            plaatsvoorkeuren={plaatsvoorkeuren}
                                            branches={branches}
                                        />
                                );
                            }
                        })}
                    </PrintPage>
                ))}
            </MarktDetailBase>
        );
    }
}
