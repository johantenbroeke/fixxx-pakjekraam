const PropTypes = require('prop-types');
const React = require('react');
const Button = require('./Button');
const AlertLine = require('./AlertLine');
const Uitslag = require('./Uitslag.jsx');

const OndernemerMarktTile = ({
    markt,
    aanmeldingVandaag,
    aanmeldingMorgen,
    toewijzingVandaag,
    toewijzingMorgen,
    today,
    ondernemer,
    tomorrow,
}) => {
    return (
        <div className="OndernemerMarktTile well background-link-parent col-1-2">
            <h2 className="OndernemerMarktTile__heading">{markt.naam}</h2>
            <a className="background-link" href={`/markt-detail/${markt.id}`} />
            <Button label={`Ga naar ${markt.naam}`} href={`/markt-detail/${markt.id}`} />
            <Uitslag today={today} ondernemer={ondernemer} markt={markt} tomorrow={tomorrow} toewijzingVandaag={toewijzingVandaag} toewijzingMorgen={toewijzingMorgen} aanmeldingVandaag={aanmeldingVandaag} aanmeldingMorgen={aanmeldingMorgen}/>
        </div>
    );
};
OndernemerMarktTile.propTypes = {
    markt: PropTypes.object.isRequired,
    ondernemer: PropTypes.object.isRequired,
    aanmeldingVandaag: PropTypes.object,
    aanmeldingMorgen: PropTypes.object,
    toewijzingVandaag: PropTypes.object,
    toewijzingMorgen: PropTypes.object,
    sollicitatie: PropTypes.object,
    voorkeuren: PropTypes.object,
    indelingVoorkeuren: PropTypes.object,
    aanmeldingen: PropTypes.object,
    today: PropTypes.string,
    tomorrow: PropTypes.string,
};
module.exports = OndernemerMarktTile;
