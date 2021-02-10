const Content = require('./components/Content');
const Header = require('./components/Header');
const Page = require('./components/Page.jsx');
const PropTypes = require('prop-types');
const React = require('react');
const OndernemerProfileHeader = require('./components/OndernemerProfileHeader');
const moment = require('moment');
const { getBreadcrumbsOndernemer } = require('../util');

class ToewijzingenAfwijzingenPage extends React.Component {
    propTypes = {
        user: PropTypes.object.isRequired,
        role: PropTypes.string.isRequired
    };

    render() {
        const { user, role } = this.props;

        return (
            <Page messages={this.props.messages}>
                <Header user={user} role={role}>
                </Header>
                <Content>
                    {role === 'marktmeester' ?
                        <h2 className="Heading Heading--intro">Ondernemer</h2> : null
                    }
                    {role === 'marktmeester' ?
                        <OndernemerProfileHeader inline={true} user={ondernemer} /> : null
                    }
                    <h1 className="Heading Heading--intro">Uploaden markten</h1>
                </Content>
            </Page>
        );
    }
}

module.exports = ToewijzingenAfwijzingenPage;
