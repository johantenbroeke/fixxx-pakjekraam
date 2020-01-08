const Content = require('./components/Content');
const React = require('react');
const Page = require('./components/Page.jsx');
const AlgemeneVoorkeurenForm = require('./components/AlgemeneVoorkeurenForm.jsx');
const PropTypes = require('prop-types');
const Header = require('./components/Header');
const OndernemerProfileHeader = require('./components/OndernemerProfileHeader');
const SollicitatieSpecs = require('./components/SollicitatieSpecs');
const { getBreadcrumbsMarkt, getBreadcrumbsOndernemer } = require('../util');

class AlgemeneVoorkeurenPage extends React.Component {
    propTypes = {
        marktId: PropTypes.string,
        marktDate: PropTypes.string,
        ondernemer: PropTypes.object.isRequired,
        markt: PropTypes.object,
        voorkeur: PropTypes.object,
        branches: PropTypes.array.isRequired,
        next: PropTypes.string,
        query: PropTypes.string,
        role: PropTypes.string,
        messages: PropTypes.array,
        csrfToken: PropTypes.string,
        user: PropTypes.object.isRequired
    };

    render() {
        const { ondernemer, messages, role, markt, user } = this.props;
        let { branches } = this.props;

        branches = branches.filter(branche => branche.brancheId !== 'bak');
        branches = branches.sort((a, b) => a.brancheId - b.brancheId);

        const breadcrumbs = role === 'marktondernemer' ? getBreadcrumbsMarkt(markt, role) : getBreadcrumbsOndernemer(ondernemer, role);
        const sollicitatie = ondernemer.sollicitaties.find(soll => soll.markt.id === markt.id && !soll.doorgehaald);

        return (
            <Page messages={messages}>
                <Header
                    user={user}
                    role={role}
                    breadcrumbs={breadcrumbs}
                    >
                    { role === 'marktondernemer' ?
                        <OndernemerProfileHeader user={ondernemer} /> : null
                    }
                </Header>
                <Content>
                    { role === 'marktmeester' ?
                        <h2 className="Heading Heading--intro">Ondernemer</h2> : null
                    }
                    { role === 'marktmeester' ?
                        <OndernemerProfileHeader
                            inline={true}
                            user={ondernemer}
                        /> : null
                    }
                    { role === 'marktmeester' ?
                        <SollicitatieSpecs sollicitatie={sollicitatie} /> : null
                    }
                    <AlgemeneVoorkeurenForm
                        branches={branches}
                        markt={this.props.markt}
                        marktId={this.props.marktId}
                        marktDate={this.props.marktDate}
                        ondernemer={this.props.ondernemer}
                        voorkeur={this.props.voorkeur}
                        query={this.props.query}
                        role={role}
                        csrfToken={this.props.csrfToken}
                    />
                </Content>
            </Page>
        );
    }
}

module.exports = AlgemeneVoorkeurenPage;
