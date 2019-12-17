const {
    addDays,
    DAYS_IN_WEEK,
    SUNDAY,
    formatDayOfWeek,
    formatMonth,
    nextWeek,
    capitalize,
    relativeHumanDay,
    endOfWeek,
} = require('../util.ts');
const React = require('react');
const PropTypes = require('prop-types');
const MarktDetailBase = require('./components/MarktDetailBase');
const today = () => new Date().toISOString().replace(/T.+/, '');
const { getUpcomingMarktDays, parseMarktDag, A_LIJST_DAYS } = require('../domain-knowledge.js');

class MarktDetailPage extends React.Component {
    propTypes = {
        markt: PropTypes.object.isRequired,
        user: PropTypes.object,
        type: PropTypes.string,
        role: PropTypes.string,
        datum: PropTypes.string,
    };

    render() {
        const { markt, datum, type, role } = this.props;
        const startDate = addDays(today(), -1);
        const endDate = addDays(endOfWeek(), DAYS_IN_WEEK);
        const marktDagen = (markt.marktDagen || []).map(parseMarktDag);
        const dates = getUpcomingMarktDays(startDate, endDate, (markt.marktDagen || []).map(parseMarktDag)).map(
            (d, i) => {
                return {
                    relativeDay: relativeHumanDay(d),
                    date: d,
                    day: new Date(d).getDate(),
                    month: formatMonth(d),
                    weekDay: formatDayOfWeek(new Date(d)),
                    marktDag: marktDagen[new Date(d).getDay()],
                    weekDayInt: new Date(d).getDay(),
                };
            },
        );
        const nextVrijday = new Date(addDays(today(), DAYS_IN_WEEK - new Date().getDay()));

        let fase = null;
        markt.kiesJeKraamFase == 'live' ? fase = null : fase = ` ${markt.kiesJeKraamFase}`;

        return (
            <MarktDetailBase bodyClass="page-markt-detail" datum={datum} type={type} markt={markt} fase={fase} role={role}>
                 {/* {markt.kiesJeKraamGeblokkeerdePlaatsen ?
                 <p>Geblokkeerde plaatsen: {markt.kiesJeKraamGeblokkeerdePlaatsen}</p> :
                 null } */}
                <div className="row row--responsive Section">
                    <a href={`./langdurig-afgemeld/`} className="Link">Ondernemers langdurig afgemeld</a>
                </div>
                <h2 className="Heading Heading--intro">Lijsten per dag</h2>
                <div className="row row--responsive margin-bottom">
                    <div className="col-1-2 margin-bottom">
                        <h4>Deze week</h4>
                        {dates
                            .filter(({ date }) => new Date(date) < nextVrijday)
                            .map(({ date, day, month, weekDay, relativeDay, weekDayInt }) => (
                                <div key={date} className="well">
                                    <strong>
                                        {relativeDay !== '' && capitalize(relativeDay) + ', '}{' '}
                                        {relativeDay !== '' ? weekDay : capitalize(weekDay)} {day} {month}
                                    </strong>
                                    <ul className="LinkList">
                                    <li className="LinkList__item">
                                            <a href={`./${date}/indeling/`} className="Link">
                                                Indeling
                                            </a>
                                        </li>
                                        <li className="LinkList__item">
                                            <a href={`./${date}/indelingslijst/`} className="Link">
                                                Originele positie vasteplaatshouders
                                            </a>
                                        </li>
                                        <li className="LinkList__item">
                                            <a href={`./${date}/concept-indelingslijst/`} className="Link">
                                                Concept indelingslijst
                                            </a>
                                        </li>
                                        <li className="LinkList__item">
                                            <a href={`./${date}/voorrangslijst/`} className="Link">
                                                {!A_LIJST_DAYS.includes(weekDayInt)
                                                    ? `Ondernemers niet ingedeeld`
                                                    : `A- en B lijst aanmeldingen sollicitanten`}
                                            </a>
                                        </li>
                                        <li className="LinkList__item">
                                            <a href={`./${date}/voorrangslijst-volledig/`} className="Link">
                                                {!A_LIJST_DAYS.includes(weekDayInt)
                                                    ? `Alle sollicitanten`
                                                    : `A- en B lijst alle aanmeldingen sollicitanten`}
                                            </a>
                                        </li>
                                        <li className="LinkList__item">
                                            <a href={`./${date}/afmeldingen-vasteplaatshouders/`} className="Link">
                                                Afmeldingen vasteplaatshouders
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            ))}
                    </div>
                    <div className="col-1-2">
                        <h4>Volgende week</h4>
                        {dates
                            .filter(({ date }) => new Date(date) >= nextVrijday)
                            .map(({ date, day, month, weekDay, relativeDay, weekDayInt }) => (
                                <div key={date} className="well">
                                    <strong>
                                        {relativeDay !== '' && capitalize(relativeDay) + ', '}{' '}
                                        {relativeDay !== '' ? weekDay : capitalize(weekDay)} {day} {month}
                                    </strong>
                                    <ul className="LinkList">
                                        <li className="LinkList__item">
                                            <a href={`./${date}/afmeldingen-vasteplaatshouders/`} className="Link">
                                                Afmeldingen vasteplaatshouders
                                            </a>
                                        </li>
                                        <li className="LinkList__item">
                                            <a href={`./${date}/voorrangslijst/`} className="Link">
                                                {!A_LIJST_DAYS.includes(weekDayInt)
                                                    ? `Aanmeldingen sollicitanten`
                                                    : `A- en B lijst aanmeldingen sollicitanten`}
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            ))}
                    </div>
                </div>

            </MarktDetailBase>
        );
    }
}

module.exports = MarktDetailPage;
