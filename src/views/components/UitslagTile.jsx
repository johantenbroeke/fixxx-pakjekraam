const React = require('react');
const AlertLine = require('./AlertLine');

import {
    formatDate
} from '../../util';

import {
    printAfwijzingReason
} from '../../model/afwijzing.functions';
import {
    isMarketClosed
} from '../../model/markt.functions';

const UitslagTile = ({
    open,
    date,
    aanmelding,
    sollicitatie,
    markt,
    toewijzing,
    afwijzing
}) => {
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
                {open && !(marktGesloten && !aangemeld) ?
                    <h4 className={`UitslagTile__datum__aanwezigheid ${aangemeld ? `UitslagTile__datum__aanwezigheid--aangemeld` : null}`}>
                        {aangemeld ? (
                            "Aangemeld"
                        ) : (
                                "Niet aangemeld"
                            )}
                    </h4>
                    : null }
                {!open && !marktGesloten ?
                     <h4 className="UitslagTile__datum__aanwezigheid">Geen marktdag</h4>
                : null}
            </div>
            {marktGesloten ?
                <h4 className="UitslagTile__datum__aanwezigheid">Geen markt</h4>
                : null}
            {toewijzing && markt.kiesJeKraamFase === 'live' && !marktGesloten ?
                <AlertLine
                    type="success"
                    title="Ingedeeld"
                    titleSmall={true}
                    message={plaatsenDuiding(toewijzing.plaatsen)}
                    inline={true}
                /> : null}
            {afwijzing && markt.kiesJeKraamFase === 'live' && !marktGesloten ?
                <AlertLine
                    type="default"
                    title="Afgewezen"
                    titleSmall={true}
                    message={`${afwijzing.reasonCode ? printAfwijzingReason(afwijzing.reasonCode) : 'Het is niet gelukt u in te delen.'}`}
                    inline={true}
                /> : null}
            {open && !toewijzing && !afwijzing && aangemeld && markt.kiesJeKraamFase === 'live' && !marktGesloten ?
                <p className="UitslagTile__text">Er is (nog) geen indeling</p> : null
            }
        </div>
    );
};

module.exports = UitslagTile;
