const PropTypes = require('prop-types');
const React     = require('react');

const {
    getBreadcrumbsMarkt,
    getBreadcrumbsOndernemer
} = require('../util');

const AanwezigheidsForm       = require('./components/AanwezigheidsForm.jsx');
const Alert                   = require('./components/Alert.jsx');
const Content                 = require('./components/Content');
const Header                  = require('./components/Header');
const OndernemerProfileHeader = require('./components/OndernemerProfileHeader');
const Page                    = require('./components/Page.jsx');

class AanwezigheidPage extends React.Component {
    propTypes = {
        aanmeldingenPerMarktPerWeek : PropTypes.object,
        csrfToken            : PropTypes.string,
        date                 : PropTypes.string.isRequired,
        messages             : PropTypes.array,
        voorkeuren           : PropTypes.array,
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
            voorkeuren,
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

                    <Alert
                        type="warning wide"
                        inline="true"
                        title="Digitaal ingedeeld? Dan ook komen!"
                    >
                        <p>
                            Een aangevinkte dag betekent dat u (of uw vervanger) aanwezig zal zijn.
                        </p>
                        <p className="sub">
                            Bent u er niet? Dan brengen wij het marktgeld de volgende keer dat u op
                            de markt bent in rekening. Indien u niet aan uw betaalverplichting voldoet,
                            zijn wij genoodzaakt uw vergunning in te trekken totdat u heeft betaald.
                        </p>
                    </Alert>

                    <AanwezigheidsForm
                        date={date}
                        ondernemer={ondernemer}
                        sollicitaties={sollicitaties}
                        aanmeldingenPerMarktPerWeek={aanmeldingenPerMarktPerWeek}
                        query={query}
                        role={role}
                        voorkeuren={voorkeuren}
                        csrfToken={csrfToken}
                    />
                </Content>
            </Page>
        );
    }
}

module.exports = AanwezigheidPage;
