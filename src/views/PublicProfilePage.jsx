const Content = require('./components/Content');
const React = require('react');
const Page = require('./components/Page.jsx');
const PropTypes = require('prop-types');
const OndernemerProfile = require('./components/OndernemerProfile.jsx');
const Header = require('./components/Header');
const OndernemerProfileHeader = require('./components/OndernemerProfileHeader');

const today = () => new Date().toISOString().replace(/T.+/, '');

class PublicProfilePage extends React.Component {
    propTypes = {
        ondernemer: PropTypes.object,
        user: PropTypes.object.isRequired,
        messages: PropTypes.array,
        role: PropTypes.string,
    };

    render(state) {
        const { ondernemer, role, messages, user } = this.props;

        return (
            <Page messages={messages}>
                <Header user={user} role={role}>
                    {/* <OndernemerProfileHeader user={ondernemer} /> */}
                </Header>
                <Content>
                    <OndernemerProfile ondernemer={ondernemer} />
                </Content>
            </Page>
        );
    }
}
module.exports = PublicProfilePage;
