const PropTypes = require('prop-types');
const React = require('react');
const AlertLine = require('./AlertLine');
const { formatDate } = require('../../util.ts');
import { printAfwijzingReason } from '../../model/afwijzing.functions';

const Component = ({ open, date, aanmelding, sollicitatie, title, markt, toewijzing, afwijzing, daysClosed }) => {
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

    const dateInDaysClosed = daysClosed.includes(date);
    const dateInGeblokeerdeData = markt.kiesJeKraamGeblokkeerdeData ?
        markt.kiesJeKraamGeblokkeerdeData.replace(/\s+/g, '').split(',').includes(date):
        false;

    const marktGesloten = dateInDaysClosed || dateInGeblokeerdeData;

    return (
        <div className="col-1-2 UitslagTile">
            <div className="UitslagTile__datum">
                <h4 className="UitslagTile__datum__heading">{title} {formatDate(date)}</h4>
                {open && !(marktGesloten && !aangemeld) ?
                    <h3 className={`UitslagTile__datum__aanwezigheid ${aangemeld ? `UitslagTile__datum__aanwezigheid--aangemeld` : null}`}>
                        {aangemeld ? (
                            "Aangemeld"
                        ) : (
                            "Niet aangemeld"
                        )}
                    </h3>
                : null }
            </div>
            { marktGesloten ?
                <AlertLine
                    type="warning"
                    // title="Er is vandaag geen markt"
                    titleSmall={true}
                    message={"Er is vandaag geen markt"}
                    inline={true}
                />
            : null }
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
            { open && !toewijzing && !afwijzing && aangemeld && markt.kiesJeKraamFase === 'live' && !marktGesloten ?
                <p className="UitslagTile__text">Er is (nog) geen indeling</p> : null
            }
        </div>
    );
};

Component.propTypes = {
    title: PropTypes.string,
    open: PropTypes.bool,
    date: PropTypes.date,
    markt: PropTypes.object,
    sollicitatie: PropTypes.object,
    aanmelding: PropTypes.object,
    toewijzing: PropTypes.object,
    afwijzing: PropTypes.object,
    daysClosed: PropTypes.array.isRequired
};

module.exports = Component;
