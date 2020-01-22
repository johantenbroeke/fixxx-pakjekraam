const Content = require('./components/Content');
const React = require('react');
const Page = require('./components/Page.jsx');
const AanwezigheidsForm = require('./components/AanwezigheidsForm.jsx');
const PropTypes = require('prop-types');
const Header = require('./components/Header');
const OndernemerProfileHeader = require('./components/OndernemerProfileHeader');
const SollicitatieSpecs = require('./components/SollicitatieSpecs');

const { getBreadcrumbsMarkt, getBreadcrumbsOndernemer } = require('../util');

class AfmeldPage extends React.Component {
    propTypes = {
        aanmeldingen: PropTypes.array,
        date: PropTypes.string.isRequired,
        markten: PropTypes.array,
        markt: PropTypes.object.isRequired,
        ondernemer: PropTypes.object.isRequired,
        messages: PropTypes.array,
        startDate: PropTypes.string.isRequired,
        endDate: PropTypes.string.isRequired,
        currentMarktId: PropTypes.string,
        query: PropTypes.string,
        role: PropTypes.string,
        mededelingen: PropTypes.object.isRequired,
        csrfToken: PropTypes.string,
        user: PropTypes.object.isRequired,
    };

    render() {
        const { ondernemer, messages, role, markt, mededelingen, user } = this.props;
        const breadcrumbs = role === 'marktondernemer' ? getBreadcrumbsMarkt(markt, role) : getBreadcrumbsOndernemer(ondernemer, role);
        const sollicitatie = ondernemer.sollicitaties.find(soll => soll.markt.id === markt.id && !soll.doorgehaald);

        return (
            <Page messages={messages}>
                <Header
                    breadcrumbs={breadcrumbs}
                    role={role}
                    user={user}
                    >
                    { role === 'marktondernemer' ?
                        <OndernemerProfileHeader user={ondernemer} /> : null
                    }
                </Header>
                <Content>
                    { markt.kiesJeKraamFase ? (
                        <p className="Paragraph Paragraph--first" dangerouslySetInnerHTML={{ __html: mededelingen.aanwezigheid[markt.kiesJeKraamFase] }} />
                    ) : null }
                    { role === 'marktmeester' ?
                        <h2 className="Heading Heading--intro">Ondernemer</h2> : null
                    }
                    { role === 'marktmeester' ?
                        <OndernemerProfileHeader inline={true} user={ondernemer} sollicitatie={sollicitatie} /> : null
                    }
                    <SollicitatieSpecs sollicitatie={sollicitatie} />
                    <AanwezigheidsForm
                        aanmeldingen={this.props.aanmeldingen}
                        date={this.props.date}
                        ondernemer={this.props.ondernemer}
                        markten={this.props.markten}
                        currentMarktId={this.props.currentMarktId}
                        query={this.props.query}
                        role={this.props.role}
                        csrfToken={this.props.csrfToken}
                    />
                </Content>
            </Page>
        );
    }
}

module.exports = AfmeldPage;
