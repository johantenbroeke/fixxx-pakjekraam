const React = require('react');
const UitslagTile = require('./UitslagTile');
const {
    tomorrow,
    today
} = require('../../util.ts');

import {
    isMarketDay
} from '../../model/markt.functions';

const Uitslag = ({
    markt,
    aanmeldingVandaag,
    aanmeldingMorgen,
    toewijzingVandaag,
    toewijzingMorgen,
    ondernemer,
    afwijzingVandaag,
    afwijzingMorgen
}) => {
    const sollicitatie = ondernemer.sollicitaties.find(sollicitatieOndernemer =>
        sollicitatieOndernemer.markt.id == markt.id
    );

    const openToday = isMarketDay(markt, today());
    const openTomorrow = isMarketDay(markt, tomorrow());

    return (
        <div className="row row--responsive">
            {markt.kiesJeKraamFase === 'activatie' || markt.kiesJeKraamFase === 'wenperiode' || markt.kiesJeKraamFase === 'live' ?
                <UitslagTile
                    markt={markt}
                    open={openToday}
                    date={today()}
                    sollicitatie={sollicitatie}
                    aanmelding={aanmeldingVandaag}
                    toewijzing={toewijzingVandaag}
                    afwijzing={afwijzingVandaag}
                /> : null}
            {markt.kiesJeKraamFase === 'activatie' || markt.kiesJeKraamFase === 'wenperiode' || markt.kiesJeKraamFase === 'live' ?
                <UitslagTile
                    markt={markt}
                    open={openTomorrow}
                    date={tomorrow()}
                    sollicitatie={sollicitatie}
                    aanmelding={aanmeldingMorgen}
                    toewijzing={toewijzingMorgen}
                    afwijzing={afwijzingMorgen}
                /> : null}
        </div>
    );
};

module.exports = Uitslag;
