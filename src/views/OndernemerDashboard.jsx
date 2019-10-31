const React = require('react');
const Page = require('./components/Page.jsx');
const PropTypes = require('prop-types');
const Header = require('./components/Header');
const Content = require('./components/Content');
const OndernemerAanwezigheid = require('./components/OndernemerAanwezigheid');
const OndernemerProfileHeader = require('./components/OndernemerProfileHeader');
const OndernemerMarktTile = require('./components/OndernemerMarktTile');
const { tomorrow, today, formatDayOfWeek, getMaDiWoDoOfToday } = require('../util.ts');

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
        user: PropTypes.object,
    };

    render() {
        const { ondernemer, messages, plaatsvoorkeuren, markten, user, aanmeldingen, toewijzingen } = this.props;

        const marktenEnabled = markten.filter(m => m.enabled);

        const sollicitaties = ondernemer.sollicitaties.filter(soll => {
            return !soll.doorgehaald && marktenEnabled.map(markt => markt.id).includes(soll.markt.id);
        });

        const marktenPlusAanmelding = sollicitaties.map(sollicitatie => {
            const marktVoorSollicitatie = marktenEnabled.find(markt => markt.id == sollicitatie.markt.id);
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
            markt.toewijzingVandaag = toewijzingenVoorDezeMarkt.find(aanmelding => aanmelding.marktDate == today());
            markt.toewijzingMorgen = toewijzingenVoorDezeMarkt.find(aanmelding => aanmelding.marktDate == tomorrow());
            return markt;
        });

        return (
            <Page messages={messages}>
                <Header user={ondernemer} logoUrl="/dashboard/">
                    <a className="Header__nav-item" href="./">
                        Mijn markten
                    </a>
                    <OndernemerProfileHeader user={ondernemer} />
                </Header>
                <Content>
                    <h1 className="h1">Mijn markten</h1>
                    <div className="row row--responsive">
                        {marktenPlusToewijzing.map(markt => (
                            <div key={markt.id} className="col-1-2">
                                <OndernemerMarktTile
                                    markt={markt}
                                    ondernemer={ondernemer}
                                    aanmeldingVandaag={markt.aanmeldingVandaag}
                                    aanmeldingMorgen={markt.aanmeldingMorgen}
                                    toewijzingVandaag={markt.toewijzingVandaag}
                                    toewijzingMorgen={markt.toewijzingMorgen}
                                    today={ today() }
                                    tomorrow={ tomorrow() }
                                />
                            </div>
                        ))}
                    </div>
                </Content>
            </Page>
        );
    }
}

module.exports = OndernemerDashboard;
