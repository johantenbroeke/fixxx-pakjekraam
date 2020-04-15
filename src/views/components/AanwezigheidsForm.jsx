const Form = require('./Form');
const React = require('react');
const PropTypes = require('prop-types');

const SollicitatieSpecs = require('./SollicitatieSpecs');

const {
    formatDayOfWeekShort,
    formatDate,
    endOfWeek,
    addDays,
    toISODate,
    WEEK_DAYS_SHORT
} = require('../../util.ts');

const {
    getMarktThresholdDate,
    filterRsvpList,
    isVast
} = require('../../domain-knowledge.js');

class AanwezigheidsForm extends React.Component {
    propTypes = {
        ondernemer           : PropTypes.object.isRequired,
        aanmeldingenPerMarkt : PropTypes.array,
        sollicitaties        : PropTypes.array.isRequired,
        markten              : PropTypes.array.isRequired,
        query                : PropTypes.string,
        role                 : PropTypes.string,
        csrfToken            : PropTypes.string,
    };

    render() {
        const {
            aanmeldingenPerMarkt = [],
            csrfToken,
            markten,
            ondernemer,
            role,
            sollicitaties
        } = this.props;

        const thresholdDate = getMarktThresholdDate(role);

        const aanmeldingenPerMarktPerWeek = markten.map(markt => {
            const aanmeldingen = aanmeldingenPerMarkt[markt.id] ?
                                 aanmeldingenPerMarkt[markt.id].filter(({ marktId }) => marktId === markt.id) :
                                 [];
            const aanmeldingenPerDag = filterRsvpList(aanmeldingen, markt);

            const aanmeldingenPerWeek = aanmeldingenPerDag.reduce((result, { date, rsvp }) => {
                // Voeg de tijd toe, zodat we een datum in de huidige tijdszone krijgen.
                // Doen we dit niet, dan wordt de datum ingesteld op UTC. Aangezien wij in de
                // zomer op UTC+2 zitten is de datumwissel bij ons twee uur eerder. Gebruikers
                // zouden in dit geval twee uur na de automatische indeling hun aanwezigheid nog
                // kunnen aanpassen
                date = new Date(date+' 00:00:00');

                const week        = date > new Date(endOfWeek()) ? 1 : 0;
                const weekDay     = date.getDay();
                const attending   = rsvp ? rsvp.attending : isVast(sollicitaties[markt.id].status);
                const isInThePast = date < thresholdDate;

                result[week][weekDay] = {
                    date,
                    attending,
                    isInThePast
                };

                return result;
            }, [{}, {}]);

            return {
                markt,
                aanmeldingenPerWeek
            };
        });

        // Wordt in de HTML gebruikt om de `rsvp` <input>s te nummeren.
        let index = -1;

        return (
        <Form className="AanwezigheidsForm" decorator="" csrfToken={csrfToken}>
            <input
                id="erkenningsNummer"
                name="erkenningsNummer"
                defaultValue={ondernemer.erkenningsnummer}
                type="hidden"
            />

            {aanmeldingenPerMarktPerWeek.map(({ markt, aanmeldingenPerWeek }) => (
            <div className="markt" key="{markt.id}">
                <h2 className="Heading Heading--intro">
                    {markt.naam} <SollicitatieSpecs sollicitatie={sollicitaties[markt.id]} />
                </h2>

                {aanmeldingenPerWeek.map((week, i) => (
                <div className="week" key="{i}">
                    <h4>{i === 0 ? 'Deze week' : 'Volgende week'}</h4>

                    {[0, 1, 2, 3, 4, 5, 6].map(day => (
                    day in week ?
                        <span className="day" key={++index}>
                            <input type="hidden" name={`rsvp[${index}][marktId]`}
                                   disabled={week[day].isInThePast} defaultValue={markt.id}
                            />
                            <input type="hidden" name={`rsvp[${index}][marktDate]`}
                                   disabled={week[day].isInThePast} defaultValue={week[day].date.toISOString()}
                            />

                            <input
                                type="checkbox"
                                id={`rsvp-${index}`}
                                name={`rsvp[${index}][attending]`}
                                disabled={week[day].isInThePast}
                                defaultValue="1"
                                defaultChecked={week[day].attending}
                            />
                            <label htmlFor={`rsvp-${index}`}>
                                <strong>{WEEK_DAYS_SHORT[day]}</strong>
                            </label>
                        </span>
                    :
                        <span className="day" key={++index}>
                            <input
                                disabled={true}
                                id={`rsvp-${index}`}
                                type="checkbox"
                                defaultValue="0"
                            />
                            <label htmlFor={`rsvp-${index}`}>
                                <strong>{WEEK_DAYS_SHORT[day]}</strong>
                            </label>
                        </span>
                    ))}
                </div>
                ))}
            </div>
            ))}

            <p className="InputField InputField--submit">
                <a
                    className="Button Button--tertiary"
                    href={`${
                        role === 'marktmeester'
                            ? `/profile/${ondernemer.erkenningsnummer}`
                            : `/dashboard`
                        }`}
                >
                    Voorkeuren
                </a>
                <button
                    className="Button Button--secondary"
                    type="submit"
                    name="next"
                    value={`${
                        role === 'marktmeester'
                            ? `/profile/${ondernemer.erkenningsnummer}?error=aanwezigheid-saved`
                            : `/dashboard?error=aanwezigheid-saved`
                        }`}
                >
                    Bewaren
                </button>
            </p>
        </Form>
        );
    }
}
module.exports = AanwezigheidsForm;
