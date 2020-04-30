const Content = require('./components/Content');
const React = require('react');
const Page = require('./components/Page.jsx');
const AanwezigheidsForm = require('./components/AanwezigheidsForm.jsx');
const PropTypes = require('prop-types');
const Header = require('./components/Header');
const OndernemerProfileHeader = require('./components/OndernemerProfileHeader');

const { getBreadcrumbsMarkt, getBreadcrumbsOndernemer } = require('../util');

class AanwezigheidPage extends React.Component {
    propTypes = {
        aanmeldingenPerMarktPerWeek : PropTypes.object,
        csrfToken            : PropTypes.string,
        date                 : PropTypes.string.isRequired,
        mededelingen         : PropTypes.object.isRequired,
        messages             : PropTypes.array,
        ondernemer           : PropTypes.object.isRequired,
        query                : PropTypes.string,
        role                 : PropTypes.string,
        sollicitaties        : PropTypes.object,
        user                 : PropTypes.object.isRequired
    };

    render() {
        const {
            aanmeldingenPerMarktPerWeek,
            csrfToken,
            date,
            mededelingen,
            messages,
            ondernemer,
            query,
            role,
            sollicitaties,
            user
        } = this.props;

        const breadcrumbs = /* role === 'marktondernemer' ?
                            getBreadcrumbsMarkt(markt, role) :*/
                            getBreadcrumbsOndernemer(ondernemer, role);

        return (
            <Page messages={messages}>
                <Header breadcrumbs={breadcrumbs} role={role} user={user}>
                    { role === 'marktondernemer' &&
                    <OndernemerProfileHeader user={ondernemer} />
                    }
                </Header>
                <Content>
                    {/* markt.kiesJeKraamFase ? (
                        <p className="Paragraph Paragraph--first" dangerouslySetInnerHTML={{ __html: mededelingen.aanwezigheid[markt.kiesJeKraamFase] }} />
                    ) : null */}
                    { role === 'marktmeester' &&
                    <>
                        <h2 className="Heading Heading--intro">Ondernemer</h2>
                        <OndernemerProfileHeader inline={true} user={ondernemer} />
                    </>
                    }

                    <p>
                        Een aangevinkte dag betekent dat u (of uw vervanger) aanwezig zal zijn.
                    </p>

                    <AanwezigheidsForm
                        date={date}
                        ondernemer={ondernemer}
                        sollicitaties={sollicitaties}
                        aanmeldingenPerMarktPerWeek={aanmeldingenPerMarktPerWeek}
                        query={query}
                        role={role}
                        csrfToken={csrfToken}
                    />
                </Content>
            </Page>
        );
    }
}

module.exports = AanwezigheidPage;
