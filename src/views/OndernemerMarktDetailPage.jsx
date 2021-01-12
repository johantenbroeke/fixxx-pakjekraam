const React = require('react');
const moment = require('moment');
const Page = require('./components/Page.jsx');
const PropTypes = require('prop-types');
const Header = require('./components/Header');
const Content = require('./components/Content');
const OndernemerProfileHeader = require('./components/OndernemerProfileHeader');
const SollicitatieSpecs = require('./components/SollicitatieSpecs');
const OndernemerMarktVoorkeuren = require('./components/OndernemerMarktVoorkeuren');
const OndernemerMarktAanwezigheid = require('./components/OndernemerMarktAanwezigheid');
const OndernemerMarktAlgVoorkeuren = require('./components/OndernemerMarktAlgVoorkeuren');
const { today, tomorrow, getBreadcrumbsOndernemer } = require('../util.ts');
const Alert = require('./components/Alert');
const Uitslag = require('./components/Uitslag');
const { filterRsvpList, isExp } = require('../domain-knowledge.js');

class OndernemerMarktDetailPage extends React.Component {
    propTypes = {
        ondernemer: PropTypes.object.isRequired,
        plaatsvoorkeuren: PropTypes.array.isRequired,
        aanmeldingen: PropTypes.array.isRequired,
        markt: PropTypes.object.isRequired,
        marktId: PropTypes.string.isRequired,
        voorkeur: PropTypes.object.isRequired,
        branches: PropTypes.object.isRequired,
        messages: PropTypes.array,
        toewijzingen: PropTypes.array,
        afwijzingen: PropTypes.array,
        startDate: PropTypes.string.isRequired,
        endDate: PropTypes.string.isRequired,
        user: PropTypes.object,
        mededelingen: PropTypes.object,
        algemeneVoorkeur: PropTypes.object,
        role: PropTypes.string,
        daysClosed: PropTypes.array.isRequired,
    };

    render() {
        const {
            ondernemer,
            plaatsvoorkeuren,
            aanmeldingen,
            messages,
            markt,
            voorkeur,
            branches,
            toewijzingen,
            afwijzingen,
            mededelingen,
            algemeneVoorkeur,
            role,
            user,
            daysClosed
        } = this.props;
        const sollicitatie = ondernemer.sollicitaties.find(soll =>
            soll.markt.id === markt.id
        );

        const rsvpEntries = filterRsvpList(
            aanmeldingen.filter(aanmelding => aanmelding.marktId === markt.id),
            markt,
            today(),
        );

        const absentGemeld = algemeneVoorkeur ? ( algemeneVoorkeur.absentFrom && algemeneVoorkeur.absentUntil )  : false;
        const breadcrumbs = getBreadcrumbsOndernemer(ondernemer, role);

        return (
            <Page messages={messages}>
                <Header
                    user={user}
                    role={role}
                    breadcrumbs={breadcrumbs}
                    >
                    <OndernemerProfileHeader user={ondernemer} />
                </Header>
                <Content>
                    <h1 className="Heading Heading--intro">{markt.naam}</h1>
                    <div className="Section Section--column Section--flat-top">
                    { markt.kiesJeKraamFase === 'wenperiode' || markt.kiesJeKraamFase === 'live' ?
                        <a href={`/pdf/kaart-${markt.afkorting}.pdf`} rel="noopener noreferrer" target="_blank" className="Link">Kaart {markt.naam}</a> : null
                    }
                    </div>
                    { markt.kiesJeKraamFase ? (
                        <p dangerouslySetInnerHTML={{ __html: mededelingen.marktDetail[markt.kiesJeKraamFase] }} />
                    ) : null}
                    { markt.kiesJeKraamMededelingActief ? (
                        <Alert type="warning" inline={true} title={markt.kiesJeKraamMededelingTitel}>
                            {markt.kiesJeKraamMededelingTekst}
                        </Alert>
                    ) : null }
                    <SollicitatieSpecs sollicitatie={sollicitatie} markt={markt} />
                    <Uitslag
                        ondernemer={ondernemer}
                        markt={markt}
                        toewijzingen={toewijzingen}
                        afwijzingen={afwijzingen}
                        aanmeldingen={aanmeldingen}
                    />
                    { absentGemeld ? (
                        <Alert type="warning" inline={true}>
                            <span>
                                LET OP: U bent langere tijd afwezig gemeld <strong>({moment(algemeneVoorkeur.absentFrom).format('DD-MM-YYYY')} t/m {moment(algemeneVoorkeur.absentUntil).format('DD-MM-YYYY')})</strong>. Klopt dit niet, neem dan contact op met de marktmeesters via {markt.telefoonNummerContact}.
                            </span>
                        </Alert>
                    ) : null }
                    {!voorkeur || !voorkeur.brancheId ? (
                        <Alert type="warning" inline={true}>
                            <span>
                                U hebt uw <strong>koopwaar</strong> nog niet doorgegeven in het{' '}
                                <a href={`/algemene-voorkeuren/${markt.id}/`}>marktprofiel</a>.
                            </span>
                        </Alert>
                    ) : null }

                    <div className="row row--responsive">
                        <div className="col-1-2">
                            <OndernemerMarktAanwezigheid
                                markt={markt}
                                sollicitatie={sollicitatie}
                                rsvpEntries={rsvpEntries}
                                disabled={ !voorkeur || !voorkeur.brancheId }
                            />
                        </div>
                        <div className="col-1-2">
                            <OndernemerMarktAlgVoorkeuren
                                sollicitatie={sollicitatie}
                                ondernemer={ondernemer}
                                markt={markt}
                                voorkeur={voorkeur}
                                branches={branches}
                            />
                            { !isExp(sollicitatie.status) ?
                            <OndernemerMarktVoorkeuren
                                ondernemer={ondernemer}
                                markt={markt}
                                mededelingen={mededelingen}
                                plaatsvoorkeuren={plaatsvoorkeuren}
                                voorkeur={voorkeur}
                                sollicitatie={sollicitatie}
                            /> : null
                            }
                        </div>
                    </div>
                </Content>
            </Page>
        );
    }
}

module.exports = OndernemerMarktDetailPage;
