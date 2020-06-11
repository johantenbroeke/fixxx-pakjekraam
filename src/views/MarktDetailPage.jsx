const React           = require('react');
const PropTypes       = require('prop-types');

const MarktDetailBase = require('./components/MarktDetailBase');
const AlertLine       = require('./components/AlertLine');

const {
    addDays,
    capitalize,
    DAYS_IN_WEEK,
    endOfWeek,
    formatDayOfWeek,
    formatMonth,
    INDELINGSTYPE__AB_LIJST,
    relativeHumanDay,
    toISODate,
    yyyyMmDdtoDDMMYYYY
} = require('../util.ts');

const {
    getUpcomingMarktDays,
    parseMarktDag,
    A_LIJST_DAYS
} = require('../domain-knowledge.js');

const today = () => toISODate(new Date());

class MarktDetailPage extends React.Component {
    propTypes = {
        markt: PropTypes.object.isRequired,
        user: PropTypes.object,
        type: PropTypes.string,
        role: PropTypes.string,
        datum: PropTypes.string,
    };

    render() {
        const { markt, datum, type, role, user } = this.props;

        const marktDaysPerWeek = this._getMarktDaysUntilNextWeek(markt);
        const fase = markt.kiesJeKraamFase !== 'live' ?
                     ` ${markt.kiesJeKraamFase}` :
                     null;

        return (
            <MarktDetailBase bodyClass="page-markt-detail" datum={datum} type={type} markt={markt} fase={fase} user={user} role={role}>
                <div className="Section Section--column">
                    <a href={`./langdurig-afgemeld/`} className="Link">Ondernemers langdurig afgemeld</a>
                    {markt.kiesJeKraamFase !== 'wenperiode' ?
                        <a href={`./${today()}/alle-sollicitanten/`} className="Link">Alle sollicitanten</a> : null
                    }
                    {markt.kiesJeKraamFase === 'activatie' || markt.kiesJeKraamFase === 'voorbereiding' ?
                        <a href={`./${today()}/indelingslijst/`} className="Link">Positie vasteplaatshouders</a> : null
                    }
                    {markt.kiesJeKraamFase === 'wenperiode' || markt.kiesJeKraamFase === 'live' ?
                        <a href={`/pdf/kaart-${markt.afkorting}.pdf`} rel="noopener noreferrer" target="_blank" className="Link">Kaart {markt.naam}</a> : null
                    }
                </div>
                {markt.kiesJeKraamGeblokkeerdePlaatsen ?
                    <AlertLine
                        type="warning"
                        title="Geblokkeerde plaatsen"
                        titleSmall={true}
                        message={`Plaatsen: ${markt.kiesJeKraamGeblokkeerdePlaatsen}`}
                        inline={true}
                    /> : null
                }
                {markt.kiesJeKraamGeblokkeerdeData ?
                    <AlertLine
                        type="warning"
                        title="Geblokkeerde data"
                        titleSmall={true}
                        message={`Data: ${markt.kiesJeKraamGeblokkeerdeData.split(',').map(date => yyyyMmDdtoDDMMYYYY(date))}`}
                        inline={true}
                    /> : null
                }
                <h2 className="Heading Heading--intro">Lijsten per dag</h2>
                <div className="row row--responsive margin-bottom">
                    <div className="col-1-2 margin-bottom">
                        <h4>Deze week</h4>
                        {
                            marktDaysPerWeek[0].length ?
                            this.renderWeek(markt, marktDaysPerWeek[0]) :
                            <i>Geen resterende marktdagen</i>
                        }
                    </div>

                    <div className="col-1-2">
                        <h4>Volgende week</h4>
                        {
                            marktDaysPerWeek[1].length ?
                            this.renderWeek(markt, marktDaysPerWeek[1]) :
                            <i>Geen marktdagen</i>
                        }
                    </div>
                </div>
            </MarktDetailBase>
        );
    }

    renderWeek(markt, marktWeek) {
        return marktWeek.map(marktDay => {
            const options = this._determineDayViewOptions(markt, marktDay);
            return this.renderDay(marktDay, options);
        });
    }

    renderDay(
        {
            date, day, month, weekDay, relativeDay
        }, {
            indeling, nietIngedeeld, conceptIndeling, voorrangsLijst,
            alleSollicitanten, afmeldingenVPHs, abLijst
        }
    ) {
        return (
        <div key={date} className="well">
            <strong>
                {relativeDay !== '' && capitalize(relativeDay) + ', '}{' '}
                {relativeDay !== '' ? weekDay : capitalize(weekDay)} {day} {month}
            </strong>
            <ul className="LinkList">
                {indeling &&
                <li className="LinkList__item">
                    <a href={`./${date}/indeling/`} className="Link">Indeling</a>
                </li>}

                {conceptIndeling &&
                <li className="LinkList__item">
                    <a href={`./${date}/concept-indelingslijst/`} className="Link">
                        Conceptindeling
                    </a>
                </li>}

                {nietIngedeeld &&
                <li className="LinkList__item">
                    <a href={`./${date}/ondernemers-niet-ingedeeld/`} className="Link">
                        Ondernemers niet ingedeeld
                    </a>
                </li>}

                {voorrangsLijst &&
                <li className="LinkList__item">
                    <a href={`./${date}/voorrangslijst/`} className="Link">
                        Voorrangslijst
                </a>
                </li>}

                {alleSollicitanten &&
                <li className="LinkList__item">
                    <a href={`./${date}/alle-sollicitanten/`} className="Link">
                        Alle sollicitanten
                </a>
                </li>}

                {afmeldingenVPHs &&
                <li className="LinkList__item">
                    <a href={`./${date}/afmeldingen-vasteplaatshouders/`} className="Link">
                        Afmeldingen vasteplaatshouders
                    </a>
                </li>}

                {abLijst &&
                <li className="LinkList__item">
                    <a href={`./${date}/a-b-lijst/`} className="Link">
                        A/B lijst
                    </a>
                </li>}
            </ul>
        </div>
        );
    }

    _determineDayViewOptions(markt, marktDay) {
        const fase    = markt.kiesJeKraamFase;
        const week    = marktDay.week;
        const isToday = marktDay.date === today();

        const indeling          = fase === 'wenperiode' && week === 0 && isToday ||
                                  fase === 'live'       && week === 0 && isToday;
        const nietIngedeeld     = fase === 'activatie' ||
                                  indeling;
        const conceptIndeling   = fase === 'voorbereiding'                  ||
                                  fase === 'activatie'                      ||
                                  fase === 'wenperiode'                     ||
                                  fase === 'live' && week === 0 && !isToday ||
                                  fase === 'live' && week === 1;
        const voorrangsLijst    = fase === 'wenperiode' && week === 0 && isToday;
        const alleSollicitanten = fase === 'wenperiode' && week === 0 && !isToday ||
                                  fase === 'wenperiode' && week === 1             ||
                                  fase === 'live'       && week === 0 && !isToday ||
                                  fase === 'live'       && week === 1;
        const afmeldingenVPHs   = fase === 'activatie'  ||
                                  fase === 'wenperiode' ||
                                  fase === 'live';
        const abLijst           = A_LIJST_DAYS.includes(marktDay.weekDayInt) &&
                                  markt.indelingstype === INDELINGSTYPE__AB_LIJST && (
                                      fase === 'activatie' ||
                                      fase === 'wenperiode' ||
                                      fase === 'live'
                                  );

        return {
            indeling,
            nietIngedeeld,
            conceptIndeling,
            voorrangsLijst,
            alleSollicitanten,
            afmeldingenVPHs,
            abLijst
        };
    }

    _getMarktDaysUntilNextWeek(markt) {
        const startDate  = addDays(today(), -1);
        const endDate    = addDays(endOfWeek(), DAYS_IN_WEEK);
        const marktDagen = (markt.marktDagen || []).map(parseMarktDag);
        const dates      = getUpcomingMarktDays(startDate, endDate, marktDagen)
        .reduce((result, date) => {
            const week = new Date(date) > new Date(endOfWeek()) ? 1 : 0;
            result[week].push({
                relativeDay : relativeHumanDay(date),
                date,
                day         : new Date(date).getDate(),
                month       : formatMonth(date),
                week,
                weekDay     : formatDayOfWeek(new Date(date)),
                marktDag    : marktDagen[new Date(date).getDay()],
                weekDayInt  : new Date(date).getDay()
            });
            return result;
        }, [[], []]);

        return dates;
    }
}

module.exports = MarktDetailPage;
