const PropTypes = require('prop-types');
const React = require('react');

const {
    isVast,
    isTVPLZ
} = require('../../domain-knowledge.js');

const SollicitatieSpecs = ({ markt, sollicitatie }) => {
    const aantalPlaatsen = sollicitatie.vastePlaatsen.length;
    const vastePlaatsen = aantalPlaatsen ?
                          sollicitatie.vastePlaatsen.join(', ') :
                          '';

    return (
        <div className="SollicitatieSpecs">
            <span className={`Pil Pil--${sollicitatie.status}`}>{sollicitatie.status}</span>
            <span className="Pil">sollnr. {sollicitatie.sollicitatieNummer}</span>

            {aantalPlaatsen > 0 ? (
                <span className="Pil">
                    { isTVPLZ(sollicitatie.status) ?
                         `${aantalPlaatsen} plaats${aantalPlaatsen > 1 ? 'en' : ''}`:
                         `plaats${aantalPlaatsen > 1 ? 'en' : ''} ${vastePlaatsen}`
                    }
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
