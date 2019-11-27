const Content = require('./components/Content');
const React = require('react');
const Page = require('./components/Page.jsx');
const PlaatsvoorkeurenForm = require('./components/PlaatsvoorkeurenForm.jsx');
const PropTypes = require('prop-types');
const Header = require('./components/Header');
const OndernemerProfileHeader = require('./components/OndernemerProfileHeader');
const OndernemerMarktHeading = require('./components/OndernemerMarktHeading');

class VoorkeurenPage extends React.Component {
    propTypes = {
        plaatsvoorkeuren: PropTypes.array.isRequired,
        markten: PropTypes.array.isRequired,
        ondernemer: PropTypes.object.isRequired,
        marktPaginas: PropTypes.object,
        marktPlaatsen: PropTypes.object,
        indelingVoorkeur: PropTypes.object,
        marktDate: PropTypes.string,
        messages: PropTypes.array,
        query: PropTypes.string,
        user: PropTypes.object,
        role: PropTypes.object,
        markt: PropTypes.object,
        sollicitatie: PropTypes.object,
        mededeling: PropTypes.object,
        csrfToken: PropTypes.string,
    };

    render() {
        const {
            marktPaginas,
            marktPlaatsen,
            indelingVoorkeur,
            marktDate,
            user,
            role,
            plaatsvoorkeuren,
            ondernemer,
            markt,
            sollicitatie,
            mededeling,
            csrfToken,
        } = this.props;
        const rows = (
            markt.rows ||
            marktPaginas.reduce(
                (list, pagina) => [
                    ...list,
                    ...pagina.indelingslijstGroup.map(group => group.plaatsList).filter(Array.isArray),
                ],
                [],
            )
        ).map(row =>
            row.map(plaatsId => marktPlaatsen.find(plaats => plaats.plaatsId === plaatsId)).map(plaats => plaats),
        );

        return (
            <Page messages={this.props.messages}>
                <Header user={ondernemer} logoUrl={role === 'marktmeester' ? '/markt/' : '/dashboard/'}>
                    <a className="Header__nav-item" href={role === 'marktmeester' ? '/markt/' : '/dashboard/'}>
                        {role === 'marktmeester' ? 'Markten' : 'Mijn markten'}
                    </a>
                    <OndernemerProfileHeader user={this.props.ondernemer} />
                </Header>
                <Content>
                    <OndernemerMarktHeading markt={markt} sollicitatie={sollicitatie} />
                    <p>
                        U kunt de plaatsvoorkeuren voor morgen tot 21.00 uur wijzigen.
                    <br />
                        Wijzigt u de plaatsvoorkeuren na 21.00 uur? Dan gelden de wijzigingen voor de dagen na morgen.
                    </p>
                    { markt.kiesJeKraamFase ? (
                        <p dangerouslySetInnerHTML={{ __html: mededeling[markt.kiesJeKraamFase] }} />
                    ) : null}
                    <PlaatsvoorkeurenForm
                        plaatsvoorkeuren={plaatsvoorkeuren}
                        ondernemer={this.props.ondernemer}
                        markt={this.props.markten[0]}
                        indelingVoorkeur={indelingVoorkeur}
                        marktDate={marktDate}
                        rows={rows}
                        role={role}
                        query={this.props.query}
                        sollicitatie={sollicitatie}
                        csrfToken={csrfToken}
                    />
                </Content>
            </Page>
        );
    }
}

module.exports = VoorkeurenPage;
