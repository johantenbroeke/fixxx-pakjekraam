import * as React from 'react';

import {
    IRSVP,
    IMarktplaats,
    IMarktondernemer,
    IToewijzing,
    IMarkt,
    IObstakelBetween,
    IMarktondernemerVoorkeur,
    IBranche
} from '../markt.model';
import {
    IAllocationPrintout
} from '../model/printout.model';

import {
    ondernemersToLocatieKeyValue,
    obstakelsToLocatieKeyValue
} from '../domain-knowledge.js';
import {
    arrayToObject,
    getBreadcrumbsMarkt
} from '../util';

import MarktDetailBase from './components/MarktDetailBase';
import IndelingsLegenda from './components/IndelingsLegenda';
import IndelingslijstGroup from './components/IndelingslijstGroup';
import PrintPage from './components/PrintPage';
import Street from './components/Street';

type IndelingslijstPageState = {
    aanmeldingen: IRSVP[];
    obstakels: IObstakelBetween[];
    marktplaatsen: IMarktplaats[];
    ondernemers: IMarktondernemer[];
    paginas: IAllocationPrintout;
    toewijzingen: IToewijzing[];
    markt: IMarkt;
    voorkeuren: IMarktondernemerVoorkeur[];
    marktId: string;
    datum: string;
    type: string;
    branches: IBranche[];
    role: string;
    user: object;
};

const titleMap: { [index: string]: string } = {
    wenperiode               : 'Indelingslijst',
    indeling                 : 'Indeling',
    'concept-indelingslijst' : 'Concept indelingslijst',
};

export default class IndelingslijstPage extends React.Component {
    public render() {
        const props = this.props as IndelingslijstPageState;
        const {
            aanmeldingen,
            obstakels,
            marktplaatsen,
            ondernemers,
            paginas,
            markt,
            datum,
            type = 'indeling',
            voorkeuren,
            branches,
            role,
            user
        } = props;

        const title        = titleMap[type];
        const breadcrumbs  = getBreadcrumbsMarkt(markt, role);

        const plaatsList   = arrayToObject(marktplaatsen, 'plaatsId');
        const vphl         = ondernemersToLocatieKeyValue(ondernemers);
        const obstakelList = obstakelsToLocatieKeyValue(obstakels);

        const toewijzingen = type !== 'wenperiode' ? props.toewijzingen : [];

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
                user={user}
                printButton={true}
            >
            {paginas.map((page, j) => (
                <PrintPage
                    key={`page-${j}`}
                    index={j}
                    title={`${title} ${markt.naam}`}
                    label={page.title}
                    datum={datum}
                >
                {page.indelingslijstGroup.map((pageItem, i) =>
                    pageItem.type && pageItem.type === 'street' ?
                    <Street key={`page-street-${i}`} title={pageItem.title} /> :
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
                         branches={branches}
                     />
                )}
                </PrintPage>
            ))}

                <PrintPage
                    key="legenda"
                    title={`Legenda ${markt.naam}`}
                    datum={datum}
                >
                    <IndelingsLegenda
                        branches={branches}
                        marktplaatsen={marktplaatsen}
                        ondernemers={ondernemers}
                        aanmeldingen={aanmeldingen}
                        toewijzingen={toewijzingen}
                    ></IndelingsLegenda>
                </PrintPage>
            </MarktDetailBase>
        );
    }
}
