const Content = require('./components/Content');
const Header = require('./components/Header');
const Page = require('./components/Page.jsx');
const PropTypes = require('prop-types');
const React = require('react');
const OndernemerProfileHeader = require('./components/OndernemerProfileHeader');
const moment = require('moment');

class ToewijzingenAfwijzingenPage extends React.Component {
    propTypes = {
        toewijzingen: PropTypes.array,
        afwijzingen: PropTypes.array,
        ondernemer: PropTypes.object,
        role: PropTypes.string,
        branches: PropTypes.array,
        markten: PropTypes.array,
        messages: PropTypes.array,
    };

    render() {
        const { toewijzingen, afwijzingen, ondernemer, role, branches, markten } = this.props;

        toewijzingen.map(toewijzing => {
            toewijzing.type = 'toew.';
            return toewijzing;
        });

        afwijzingen.map(afwijzing => {
            afwijzing.type = 'afw.';
            return afwijzing;
        });

        let toewijzingenAfwijzingen = [...toewijzingen, ...afwijzingen];

        // Sort by date
        toewijzingenAfwijzingen = toewijzingenAfwijzingen.sort( (a, b) =>
            new Date(a.marktDate).getTime() - new Date(b.marktDate).getTime()
        );

        // Take only the first 14 records
        toewijzingenAfwijzingen = toewijzingenAfwijzingen.slice(0, 13);

        function getBranche(brancheId) {
            if (brancheId) {
                const branche = branches.find(thisBranche => thisBranche.brancheId === brancheId);
                return branche ? branche.description : null;
            } else {
                return '';
            }
        }

        function isVph(ondernemerObj, marktId) {
            const sollicitatie = ondernemerObj.sollicitaties.find(soll => soll.markt.id === marktId);
            return !!(sollicitatie.status === 'vpl');
        }

        function getMarktAfkorting(marktId) {
            const marktFound = markten.find(markt => markt.id === marktId);
            return markt ? marktFound.afkorting : '';
        }

        return (
            <Page messages={this.props.messages}>
                <Header user={ondernemer} logoUrl="/markt/">
                    { role === 'marktmeester' ?
                        <a className="Header__nav-item" href={`/profile/${ondernemer.erkenningsnummer}`}>
                            Profile
                        </a> :
                        <a className="Header__nav-item" href={`/dashboard/`}>Mijn markten</a>
                    }
                    <OndernemerProfileHeader user={ondernemer} />
                </Header>
                <Content>
                    <h2>Toewijzingen/ afwijzingen</h2>
                    <div className="Table Table__responsive Table--toewijzingen-afwijzingen">
                        <table className="Table__table">
                            <tr>
                                <th>Datum</th>
                                <th>Markt</th>
                                <th>Type</th>
                                <th>Aantal</th>
                                <th>Flex</th>
                                <th>Bak</th>
                                <th>Evi</th>
                                <th>Voorkeuren</th>
                                <th>Branche</th>
                            </tr>
                            <tbody>
                            {toewijzingenAfwijzingen.map((item, index) => (
                                <tr key={index}>
                                    <td>{ moment(item.marktDate).format('DD-MM') }</td>
                                    <td>{ getMarktAfkorting(item.marktId) }</td>
                                    <td>{ item.type }</td>
                                    <td>{ item.minimum ?
                                        <span>{ item.minimum }, { item.maximum - item.minimum } </span>:
                                        null }
                                    </td>
                                    <td>{ item.anywhere !== null ?
                                        !isVph(ondernemer, item.marktId) ?
                                        item.anywhere === true ? 'AAN' : 'UIT' :
                                        '-' :
                                        null }
                                    </td>
                                    <td>{ item.bak !== null ?
                                        item.bak === true ? 'AAN' : 'UIT' :
                                        null }
                                    </td>
                                    <td>{ item.eigenMaterieel !== null ?
                                        item.bak === true ? 'AAN' : 'UIT' :
                                        null }
                                    </td>
                                    <td>
                                        { item.plaatsvoorkeuren !== null ? item.plaatsvoorkeuren.join(',') : null }
                                    </td>
                                    <td>{ getBranche(item.brancheId) }</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </Content>
            </Page>
        );
    }
}

module.exports = ToewijzingenAfwijzingenPage;
