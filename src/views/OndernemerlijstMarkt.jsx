const React = require('react');
const MarktDetailBase = require('./components/MarktDetailBase');
const OndernemerListAfwezig = require('./components/OndernemerListAfwezig.tsx');
const PrintPage = require('./components/PrintPage');
const PropTypes = require('prop-types');
const { paginate } = require('../util');

class SollicitantenPage extends React.Component {
    propTypes = {
        markt: PropTypes.object.isRequired,
        ondernemers: PropTypes.object,
        datum: PropTypes.string,
    };

    render() {
        const { markt, ondernemers, datum } = this.props;
        const itemsOnPage = 40;

        const paginas = paginate(ondernemers, itemsOnPage);
        const paginasLists = paginate(paginas, 2);

        return (
            <MarktDetailBase
                bodyClass="page-markt-sollicitanten page-print"
                title="Ondernemers langdurig afgemeld"
                markt={markt}
                datum={datum}
                type={'ondernemers'}
                showDate={false}
            >
                {paginasLists.map((pagina, i) => (
                    <PrintPage key={i} index={i} title={`Ondernemers langdurig afgemeld: ${markt.naam}`} datum={datum}>
                        {pagina.map((list, j) => (
                            <OndernemerListAfwezig
                                key={j}
                                ondernemers={list}
                                markt={markt}
                                datum={datum}
                            />
                        ))}
                    </PrintPage>
                ))}
            </MarktDetailBase>
        );
    }
}

module.exports = SollicitantenPage;
