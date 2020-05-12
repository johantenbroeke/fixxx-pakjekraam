const PropTypes = require('prop-types');
const React = require('react');

const SollicitatieSpecs = ({ markt, sollicitatie }) => {
    return (
        <div className="SollicitatieSpecs">
            <span className={`Pil Pil--${sollicitatie.status}`}>{sollicitatie.status}</span>
            <span className="Pil">sollnr. {sollicitatie.sollicitatieNummer}</span>
            {sollicitatie.vastePlaatsen.length > 0 ? (
                <span className="Pil">
                    plaats{sollicitatie.vastePlaatsen.length > 1 ? `en` : ``} {sollicitatie.vastePlaatsen.join(', ')}
                </span>
            ) : null}
        </div>
    );
};

SollicitatieSpecs.propTypes = {
    sollicitatie: PropTypes.object.isRequired,
    markt: PropTypes.object,
};

module.exports = SollicitatieSpecs;
