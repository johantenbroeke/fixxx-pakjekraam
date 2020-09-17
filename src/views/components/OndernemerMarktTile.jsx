const React = require('react');
const Button = require('./Button');
const Uitslag = require('./Uitslag.jsx');

const OndernemerMarktTile = ({
    markt,
    aanmeldingen,
    toewijzingen,
    afwijzingen,
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
                aanmeldingen={aanmeldingen}
                toewijzingen={toewijzingen}
                afwijzingen={afwijzingen}
            />
        </div>
    );
};

module.exports = OndernemerMarktTile;
