const React = require('react');
const Page = require('./components/Page.jsx');
const PropTypes = require('prop-types');
const Header = require('./components/Header');
const Content = require('./components/Content');
const OndernemerProfileHeader = require('./components/OndernemerProfileHeader');
const OndernemerMarktTile = require('./components/OndernemerMarktTile');
const { tomorrow, today } = require('../util.ts');

class OndernemerDashboard extends React.Component {
    propTypes = {
        ondernemer       : PropTypes.object,
        aanmeldingen     : PropTypes.array,
        markten          : PropTypes.array,
        plaatsvoorkeuren : PropTypes.array,
        messages         : PropTypes.array,
        toewijzingen     : PropTypes.array,
        afwijzingen      : PropTypes.array,
        role             : PropTypes.string,
        user             : PropTypes.object.isRequired,
    };

    render() {
        const {
            ondernemer,
            messages,
            markten,
            aanmeldingen,
            toewijzingen,
            afwijzingen,
            role,
            user
        } = this.props;

        const sollicitaties = ondernemer.sollicitaties.filter(soll =>
            !!markten.find(markt => markt.id === soll.markt.id)
        );

        const marktenMetSollicitatie = sollicitaties.reduce((result, sollicitatie) => {
            const markt = markten.find(({ id }) => id == sollicitatie.markt.id);
            if (!markt) {
                return result;
            }

            return result.concat({
                markt,
                aanmeldingen : aanmeldingen.filter(({ marktId }) => marktId == markt.id),
                toewijzingen : toewijzingen.filter(({ marktId }) => marktId == markt.id),
                afwijzingen  : afwijzingen.filter(({ marktId }) => marktId == markt.id),
            });
        }, []);

        const breadcrumbs = [];

        return (
            <Page messages={messages}>
                <Header
                    breadcrumbs={breadcrumbs}
                    role={role}
                    user={user}
                >
                    <OndernemerProfileHeader user={ondernemer} />
                </Header>
                <Content>
                    <div className="Section Section--column">
                        <a href="https://www.amsterdam.nl/ondernemen/markt-straathandel/digitaal-indelen/" rel="noopener noreferrer" target="_blank" className="Link">Informatie over digitaal Indelen van de markt</a>
                        <a href="/toewijzingen-afwijzingen/" className="Link">Toewijzingen/ afwijzingen</a>
                        <a href="/aanwezigheid/" className="Link">Aanwezigheid</a>
                    </div>
                    <h1 className="Heading Heading--intro">Mijn markten</h1>
                    {marktenMetSollicitatie.length == 0 ?
                        <p>U hebt geen sollicitatie voor een markt die digitaal wordt ingedeeld. Klopt dit niet, neem dan contact op met de marktmeesters via 14 020 of <a href="mailto:marktbureau@amsterdam.nl">marktbureau@amsterdam.nl</a>.</p>
                    : null}
                    <div className="row row--responsive">
                        {marktenMetSollicitatie.map((item, index) => (
                            <OndernemerMarktTile
                                markt={item.markt}
                                key={index}
                                ondernemer={ondernemer}
                                aanmeldingen={item.aanmeldingen}
                                toewijzingen={item.toewijzingen}
                                afwijzingen={item.afwijzingen}
                            />
                        ))}
                    </div>
                </Content>
            </Page>
        );
    }
}

module.exports = OndernemerDashboard;
