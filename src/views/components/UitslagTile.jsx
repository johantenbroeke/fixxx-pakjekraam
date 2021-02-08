const React = require('react');
const AlertLine = require('./AlertLine');

import {
    formatDate
} from '../../util';

import {
    isMarketClosed
} from '../../model/markt.functions';

import {
    printAfwijzingReason
} from '../../model/afwijzing.functions';


const UitslagTile = ({
    date,
    aanmelding,
    sollicitatie,
    markt,
    toewijzing,
    afwijzing
}) => {
    // TODO: Deze status check is niet compleet!! Dit werkt alleen maar tijdens de
    //       corona periode waarbij enkel `soll` en `vpl` actief zijn.
    const aangemeld = (aanmelding && aanmelding.attending && sollicitatie.status === '?') ||
        (aanmelding && aanmelding.attending && sollicitatie.status === 'soll') ||
        ((!aanmelding || aanmelding.attending) && sollicitatie.status === 'vpl');

    function plaatsenDuiding(plaatsen) {
        if (plaatsen.length == 1) {
            return `Plaats: ${plaatsen.join(', ')}`;
        } else {
            return `Plaatsen: ${plaatsen.join(', ')}`;
        }
    }

    const marktGesloten = isMarketClosed(markt, date);

    return (
        <div className="col-1-2 UitslagTile">
            <div className="UitslagTile__datum">
                <p className="UitslagTile__datum__heading">{formatDate(date)}</p>
                {!marktGesloten ?
                    <h4 className={`UitslagTile__datum__aanwezigheid ${aangemeld ? `UitslagTile__datum__aanwezigheid--aangemeld` : null}`}>
                        {aangemeld ? (
                            "Aangemeld"
                        ) : (
                            "Niet aangemeld"
                        )}
                    </h4>
                : null }
                {marktGesloten ?
                     <h4 className="UitslagTile__datum__aanwezigheid">Geen markt</h4>
                : null}
            </div>
            {!marktGesloten && toewijzing && markt.kiesJeKraamFase === 'live' ?
                <AlertLine
                    type="success"
                    title="Ingedeeld"
                    titleSmall={true}
                    message={plaatsenDuiding(toewijzing.plaatsen)}
                    inline={true}
                />
            : null}
            {!marktGesloten && afwijzing && markt.kiesJeKraamFase === 'live' ?
                <AlertLine
                    type="default"
                    title="Afgewezen"
                    titleSmall={true}
                    message={`${afwijzing.reasonCode ? printAfwijzingReason(afwijzing.reasonCode) : 'Het is niet gelukt u in te delen.'}`}
                    inline={true}
                />
            : null}
            {!marktGesloten && !toewijzing && !afwijzing && aangemeld && markt.kiesJeKraamFase === 'live' ?
                <p className="UitslagTile__text">Er is (nog) geen indeling</p>
            : null}
        </div>
    );
};

module.exports = UitslagTile;
