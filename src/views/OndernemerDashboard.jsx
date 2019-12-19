const React = require('react');
const Page = require('./components/Page.jsx');
const PropTypes = require('prop-types');
const Header = require('./components/Header');
const Content = require('./components/Content');
const OndernemerAanwezigheid = require('./components/OndernemerAanwezigheid');
const OndernemerProfileHeader = require('./components/OndernemerProfileHeader');
const OndernemerMarktTile = require('./components/OndernemerMarktTile');
const { tomorrow, today } = require('../util.ts');

class OndernemerDashboard extends React.Component {
    propTypes = {
        ondernemer: PropTypes.object,
        aanmeldingen: PropTypes.array,
        markten: PropTypes.array,
        plaatsvoorkeuren: PropTypes.array,
        messages: PropTypes.array,
        startDate: PropTypes.string.isRequired,
        endDate: PropTypes.string.isRequired,
        toewijzingen: PropTypes.array,
        afwijzingen: PropTypes.array,
        user: PropTypes.object,
        role: PropTypes.string,
    };

    render() {
        const { ondernemer, messages, markten, aanmeldingen, toewijzingen, afwijzingen, role } = this.props;

        const sollicitaties = ondernemer.sollicitaties.filter(soll => {
            return !soll.doorgehaald && markten.map(markt => markt.id).includes(soll.markt.id);
        });

        const marktenPlusAanmelding = sollicitaties.map(sollicitatie => {
            const marktVoorSollicitatie = markten.find(markt => markt.id == sollicitatie.markt.id);
            const aanmeldingenVoorDezeMarkt = aanmeldingen.filter(aanmelding => {
                return aanmelding.marktId == marktVoorSollicitatie.id;
            });
            marktVoorSollicitatie.aanmeldingVandaag = aanmeldingenVoorDezeMarkt.find(
                aanmelding => aanmelding.marktDate == today(),
            );
            marktVoorSollicitatie.aanmeldingMorgen = aanmeldingenVoorDezeMarkt.find(
                aanmelding => aanmelding.marktDate == tomorrow(),
            );
            return marktVoorSollicitatie;
        });

        const marktenPlusToewijzing = marktenPlusAanmelding.map(markt => {
            const toewijzingenVoorDezeMarkt = toewijzingen.filter(toewijzing => {
                return toewijzing.marktId == markt.id;
            });
            const afwijzingenVoorDezeMarkt = afwijzingen.filter(toewijzing => {
                return toewijzing.marktId == markt.id;
            });
            markt.toewijzingVandaag = toewijzingenVoorDezeMarkt.find(aanmelding => aanmelding.marktDate == today());
            markt.toewijzingMorgen = toewijzingenVoorDezeMarkt.find(aanmelding => aanmelding.marktDate == tomorrow());
            markt.afwijzingVandaag = afwijzingenVoorDezeMarkt.find(afwijzing => afwijzing.marktDate == today());
            markt.afwijzingMorgen = afwijzingenVoorDezeMarkt.find(afwijzing => afwijzing.marktDate == tomorrow());
            return markt;
        });

        const breadcrumbs = [];

        return (
            <Page messages={messages}>
                <Header
                    user={ondernemer}
                    breadcrumbs={breadcrumbs}
                    role={role}
                >
                    <OndernemerProfileHeader user={ondernemer} />
                </Header>
                <Content>
                    <div className="Section Section--column">
                        <a href="https://www.amsterdam.nl/ondernemen/markt-straathandel/digitaal-indelen/" rel="noopener noreferrer" target="_blank" className="Link">Informatie over digitaal Indelen van de markt</a>
                        <a href="/toewijzingen-afwijzingen/" className="Link">Toewijzingen/ afwijzingen</a>
                    </div>
                    <h1 className="Heading Heading--intro">Mijn markten</h1>
                    <div className="row row--responsive">
                        {marktenPlusToewijzing.map((markt, index) => (
                            <OndernemerMarktTile
                                markt={markt}
                                key={index}
                                ondernemer={ondernemer}
                                aanmeldingVandaag={markt.aanmeldingVandaag}
                                aanmeldingMorgen={markt.aanmeldingMorgen}
                                toewijzingVandaag={markt.toewijzingVandaag}
                                toewijzingMorgen={markt.toewijzingMorgen}
                                afwijzingVandaag={markt.afwijzingVandaag}
                                afwijzingMorgen={markt.afwijzingMorgen}
                                today={today()}
                                tomorrow={tomorrow()}
                            />
                        ))}
                    </div>
                </Content>
            </Page>
        );
    }
}

module.exports = OndernemerDashboard;
