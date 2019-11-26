const React = require('react');
const moment = require('moment');
const Page = require('./components/Page.jsx');
const PropTypes = require('prop-types');
const Header = require('./components/Header');
const Content = require('./components/Content');
const OndernemerAanwezigheid = require('./components/OndernemerAanwezigheid');
const OndernemerProfileHeader = require('./components/OndernemerProfileHeader');
const OndernemerMarktHeading = require('./components/OndernemerMarktHeading');
const OndernemerMarktVoorkeuren = require('./components/OndernemerMarktVoorkeuren');
const OndernemerMarktAanwezigheid = require('./components/OndernemerMarktAanwezigheid');
const OndernemerMarktAlgVoorkeuren = require('./components/OndernemerMarktAlgVoorkeuren');
const { today, tomorrow, yesterday } = require('../util.ts');
const Button = require('./components/Button');
const Alert = require('./components/Alert');
const AlertLine = require('./components/AlertLine');
const Uitslag = require('./components/Uitslag');
const { getMarktDays, parseMarktDag, filterRsvpList } = require('../domain-knowledge.js');

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
        startDate: PropTypes.string.isRequired,
        endDate: PropTypes.string.isRequired,
        user: PropTypes.object,
        mededelingen: PropTypes.object,
        algemeneVoorkeur: PropTypes.object
    };

    render() {
        const {
            ondernemer,
            plaatsvoorkeuren,
            aanmeldingen,
            messages,
            markt,
            marktId,
            voorkeur,
            branches,
            toewijzingen,
            mededelingen,
            algemeneVoorkeur
        } = this.props;
        const sollicitatie = ondernemer.sollicitaties.find(soll => soll.markt.id === markt.id && !soll.doorgehaald);

        const rsvpEntries = filterRsvpList(
            aanmeldingen.filter(aanmelding => aanmelding.marktId === markt.id),
            markt,
            today(),
        );

        const dateOfTomorrow = tomorrow();

        const aanmeldingVandaag = aanmeldingen.find(aanmelding => aanmelding.marktDate == today());
        const aanmeldingMorgen = aanmeldingen.find(aanmelding => aanmelding.marktDate == tomorrow());
        const toewijzingVandaag = toewijzingen.find(aanmelding => aanmelding.marktDate == today());
        const toewijzingMorgen = toewijzingen.find(aanmelding => aanmelding.marktDate == tomorrow());

        const absentGemeld = algemeneVoorkeur ? ( algemeneVoorkeur.absentFrom && algemeneVoorkeur.absentUntil )  : false;

        return (
            <Page messages={messages}>
                <Header user={ondernemer} logoUrl="../../dashboard/">
                    <a className="Header__nav-item" href="../../dashboard/">Mijn markten</a>
                    <OndernemerProfileHeader user={ondernemer} />
                </Header>
                <Content>
                    { markt.fase ? (
                        <p dangerouslySetInnerHTML={{ __html: mededelingen.marktDetail[markt.fase] }} />
                    ) : null}
                    <OndernemerMarktHeading sollicitatie={sollicitatie} markt={markt} />
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

                    <Uitslag ondernemer={ondernemer} today={today()} tomorrow={tomorrow()} markt={markt} toewijzingVandaag={toewijzingVandaag} toewijzingMorgen={toewijzingMorgen} aanmeldingVandaag={aanmeldingVandaag} aanmeldingMorgen={aanmeldingMorgen}/>

                    <div className="row row--responsive">
                        <div className="col-1-2">
                            <OndernemerMarktAanwezigheid
                                markt={markt}
                                ondernemer={ondernemer}
                                sollicitatie={sollicitatie}
                                toewijzingen={toewijzingen}
                                rsvpEntries={rsvpEntries}
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
                            <OndernemerMarktVoorkeuren
                                ondernemer={ondernemer}
                                markt={markt}
                                mededelingen={mededelingen}
                                plaatsvoorkeuren={plaatsvoorkeuren}
                                voorkeur={voorkeur}
                                sollicitatie={sollicitatie}
                            />
                        </div>
                    </div>
                </Content>
            </Page>
        );
    }
}

module.exports = OndernemerMarktDetailPage;
