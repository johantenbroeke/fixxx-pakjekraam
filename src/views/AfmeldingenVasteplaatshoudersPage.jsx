const React = require('react');
const MarktDetailBase = require('./components/MarktDetailBase');
const OndernemerListAfwezig = require('./components/OndernemerListAfwezig.tsx');
const PrintPage = require('./components/PrintPage');
const PropTypes = require('prop-types');
const { arrayToChunks, getBreadcrumbsMarkt } = require('../util');

class afmeldingenPage extends React.Component {
    propTypes = {
        markt: PropTypes.object.isRequired,
        data: PropTypes.object,
        datum: PropTypes.string,
        vasteplaatshoudersAfgemeld: PropTypes.array,
        role: PropTypes.string,
    };

    render() {
        const {
           datum,
           markt,
           vasteplaatshoudersAfgemeld,
           role
        } = this.props;

        const columns = arrayToChunks(vasteplaatshoudersAfgemeld, 40);
        const breadcrumbs = getBreadcrumbsMarkt(markt, role);

        return (
            <MarktDetailBase
                bodyClass="page-markt-sollicitanten page-print"
                title="Afmeldingen vasteplaatshouders"
                markt={markt}
                datum={datum}
                buttonLabel={'afmeldingen'}
                showDate={false}
                type={'afmeldingen'}
                breadcrumbs={breadcrumbs}
            >
                <PrintPage
                    title={`Vasteplaatshouders afgemeld: ${markt.naam}`}
                    datum={datum}>
                    {columns.map((ondernemers, j) => (
                        <OndernemerListAfwezig
                            ondernemers={ondernemers}
                            key={j}
                        />
                    ))}
                </PrintPage>
            </MarktDetailBase>
        );
    }
}

module.exports = afmeldingenPage;
