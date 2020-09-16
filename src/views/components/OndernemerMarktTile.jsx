const React = require('react');
const Button = require('./Button');
const Uitslag = require('./Uitslag.jsx');

const OndernemerMarktTile = ({
    markt,
    aanmeldingVandaag,
    aanmeldingMorgen,
    toewijzingVandaag,
    toewijzingMorgen,
    afwijzingVandaag,
    afwijzingMorgen,
    ondernemer
}) => {
    return (
        <div className="OndernemerMarktTile well background-link-parent col-1-2">
            <h2 className="OndernemerMarktTile__heading">{markt.naam}</h2>
            <a className="background-link" href={`/markt-detail/${markt.id}`} />
            <Button label={`Voorkeuren`} href={`/markt-detail/${markt.id}`} />
            <Uitslag
                ondernemer={ondernemer}
                markt={markt}
                aanmeldingVandaag={aanmeldingVandaag}
                aanmeldingMorgen={aanmeldingMorgen}
                toewijzingVandaag={toewijzingVandaag}
                toewijzingMorgen={toewijzingMorgen}
                afwijzingVandaag={afwijzingVandaag}
                afwijzingMorgen={afwijzingMorgen}
            />
        </div>
    );
};

module.exports = OndernemerMarktTile;
