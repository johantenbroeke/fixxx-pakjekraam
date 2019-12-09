const PropTypes = require('prop-types');
const React = require('react');
const AlertLine = require('./AlertLine');
const { formatDate, getMaDiWoDoOfToday, getCurrentTime, getTimezoneTime, getTimezoneHours } = require('../../util.ts');
import { printAfwijzingReason } from '../../model/afwijzing.functions';


const Content = ({ markt, today, tomorrow, aanmeldingVandaag, aanmeldingMorgen, toewijzingVandaag, toewijzingMorgen, ondernemer, afwijzingVandaag, afwijzingMorgen }) => {
    function plaatsenDuiding(plaatsen) {
        if (plaatsen.length == 1) {
            return `Plaats: ${plaatsen.join(', ')}`;
        } else {
            return `Plaatsen: ${plaatsen.join(', ')}`;
        }
    }

    const sollicitatie = ondernemer.sollicitaties.find(sollicitatieOndernemer => {
        return sollicitatieOndernemer.markt.id == markt.id && !sollicitatieOndernemer.doorgehaald;
    });

    const timeInHours = getTimezoneHours();
    markt.geopend = markt.marktDagen.includes(getMaDiWoDoOfToday());

    // timeInHours = parseInt(timeInHours) + 7;

    return (
        <div>
            {timeInHours > 21 && timeInHours < 24 || !markt.geopend && ( markt.kiesJeKraamFase === 'wenperiode' || markt.kiesJeKraamFase === 'live' ) ? (
                <div className="OndernemerMarktTile__update-row">
                    <h4 className="OndernemerMarktTile__update-row__heading">
                        Morgen ({formatDate(tomorrow)})
                        { (aanmeldingMorgen && aanmeldingMorgen.attending && sollicitatie.status == 'soll') ||
                        ((!aanmeldingMorgen || aanmeldingMorgen.attending) && sollicitatie.status == 'vpl') ? (
                            <span className="OndernemerMarktTile__update-row__status OndernemerMarktTile__update-row__status--aangemeld"> aangemeld</span>
                        ) : (
                            <span className="OndernemerMarktTile__update-row__status OndernemerMarktTile__update-row__status--niet-aangemeld"> niet aangemeld</span>
                        )}
                    </h4>
                    { toewijzingMorgen && markt.kiesJeKraamFase === 'live' ? (
                        <AlertLine
                            type="success"
                            title="Ingedeeld"
                            titleSmall={true}
                            message={plaatsenDuiding(toewijzingMorgen.plaatsen)}
                            inline={true}
                        />
                    ) : afwijzingMorgen && markt.kiesJeKraamFase === 'live' ? (
                        <AlertLine
                            type="default"
                            title="Afgewezen"
                            titleSmall={true}
                            message={`${afwijzingMorgen.reasonCode ? printAfwijzingReason(afwijzingMorgen.reasonCode) : 'Het is niet gelukt u in te delen.'}`}
                            inline={true}
                        />
                    ) : markt.kiesJeKraamFase === 'live' ? (
                        <span> Geen toewijzing/ afwijzing </span>
                    ) : null }
                </div>
            ) : null }
            {timeInHours >= 0 && timeInHours < 18 && markt.geopend && ( markt.kiesJeKraamFase === 'wenperiode' || markt.kiesJeKraamFase === 'live' ) ? (
                <div className="OndernemerMarktTile__update-row">
                    <h4 className="OndernemerMarktTile__update-row__heading">
                        Vandaag ({formatDate(today)})
                        { (aanmeldingVandaag && aanmeldingVandaag.attending && sollicitatie.status == 'soll') ||
                        ((!aanmeldingVandaag || aanmeldingVandaag.attending) && sollicitatie.status == 'vpl') ? (
                            <span className="OndernemerMarktTile__update-row__status OndernemerMarktTile__update-row__status--aangemeld">
                                {' '}
                                aangemeld
                            </span>
                        ) : (
                            <span className="OndernemerMarktTile__update-row__status OndernemerMarktTile__update-row__status--niet-aangemeld">
                                {' '}
                                niet aangemeld
                            </span>
                        )}
                    </h4>
                    {toewijzingVandaag && markt.kiesJeKraamFase === 'live' ? (
                        <AlertLine
                            type="success"
                            title="Ingedeeld"
                            titleSmall={true}
                            message={ plaatsenDuiding(toewijzingVandaag.plaatsen) }
                            inline={true}
                        />
                    ) : afwijzingVandaag && markt.kiesJeKraamFase === 'live' ? (
                        <AlertLine
                            type="default"
                            title="Afgewezen"
                            titleSmall={true}
                            message={`${afwijzingVandaag.reasonCode ? printAfwijzingReason(afwijzingVandaag.reasonCode) : 'Het is niet gelukt u in te delen.'}`}
                            inline={true}
                        />
                    ) : markt.kiesJeKraamFase === 'live' ? (
                        <span> Geen toewijzing/ afwijzing </span>
                    ) : null }
                </div>
            ) : null}
        </div>
    );
};

Content.propTypes = {
    today: PropTypes.string,
    tomorrow: PropTypes.string,
    markt: PropTypes.object,
    ondernemer: PropTypes.object,
    aanmeldingVandaag: PropTypes.object,
    aanmeldingMorgen: PropTypes.object,
    toewijzingVandaag: PropTypes.object,
    toewijzingMorgen: PropTypes.object,
    afwijzingVandaag: PropTypes.object,
    afwijzingMorgen: PropTypes.object,
};

module.exports = Content;
