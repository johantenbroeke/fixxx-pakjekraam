const Content = require('./components/Content');
const React = require('react');
const Page = require('./components/Page.jsx');
const PropTypes = require('prop-types');
const OndernemerProfile = require('./components/OndernemerProfile.jsx');
const MarktmeesterProfile = require('./components/MarktmeesterProfile.jsx');
const Header = require('./components/Header');
const OndernemerProfileHeader = require('./components/OndernemerProfileHeader');

const { isVast } = require('../domain-knowledge.js');

const today = () => new Date().toISOString().replace(/T.+/, '');

class PublicProfilePage extends React.Component {
    propTypes = {
        ondernemer: PropTypes.object,
        user: PropTypes.object.isRequired,
        messages: PropTypes.array,
        role: PropTypes.string,
    };

    render(state) {
        const { ondernemer, role, messages } = this.props;

        return (
            <Page messages={messages}>
                <Header user={ondernemer} role={role}>
                    <a className="Header__nav-item" href="/markt/">
                        Markten
                    </a>
                    <OndernemerProfileHeader user={ondernemer} />
                </Header>
                <Content>
                    <OndernemerProfile ondernemer={ondernemer} />
                </Content>
            </Page>
        );
    }
}
module.exports = PublicProfilePage;
