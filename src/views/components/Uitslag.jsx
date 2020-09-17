const React = require('react');
const UitslagTile = require('./UitslagTile');
const {
    tomorrow,
    today
} = require('../../util.ts');

import {
    getNextMarktDate
} from '../../model/markt.functions';

const Uitslag = ({
    markt,
    ondernemer,
    aanmeldingen,
    toewijzingen,
    afwijzingen,
}) => {
    const sollicitatie = ondernemer.sollicitaties.find(sollicitatieOndernemer =>
        sollicitatieOndernemer.markt.id == markt.id
    );

    const marktDate1 = getNextMarktDate(markt, 0);
    const marktDate2 = getNextMarktDate(markt, 1);

    const aanmelding1 = aanmeldingen.find(({ marktDate }) => marktDate == marktDate1);
    const aanmelding2 = aanmeldingen.find(({ marktDate }) => marktDate == marktDate2);
    const toewijzing1 = toewijzingen.find(({ marktDate }) => marktDate == marktDate1);
    const toewijzing2 = toewijzingen.find(({ marktDate }) => marktDate == marktDate2);
    const afwijzing1  = afwijzingen.find(({ marktDate }) => marktDate == marktDate1);
    const afwijzing2  = afwijzingen.find(({ marktDate }) => marktDate == marktDate2);

    return (
        <div className="row row--responsive">
            {markt.kiesJeKraamFase === 'activatie' || markt.kiesJeKraamFase === 'wenperiode' || markt.kiesJeKraamFase === 'live' ?
            <>
                <UitslagTile
                    markt={markt}
                    date={marktDate1}
                    sollicitatie={sollicitatie}
                    aanmelding={aanmelding1}
                    toewijzing={toewijzing1}
                    afwijzing={afwijzing1}
                />
                <UitslagTile
                    markt={markt}
                    date={marktDate2}
                    sollicitatie={sollicitatie}
                    aanmelding={aanmelding2}
                    toewijzing={toewijzing2}
                    afwijzing={afwijzing2}
                />
            </>
            : null}
        </div>
    );
};

module.exports = Uitslag;
