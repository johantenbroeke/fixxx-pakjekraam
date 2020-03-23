const Form = require('./Form');
const React = require('react');
const PropTypes = require('prop-types');

const SollicitatieSpecs = require('./SollicitatieSpecs');

const {
    formatDayOfWeekShort,
    formatDate,
    endOfWeek,
    addDays,
    getTimezoneTime,
    toISODate,
} = require('../../util.ts');

const {
    indelingstijdstipInMinutes,
    INDELING_DAG_OFFSET,
    filterRsvpList,
    isVast
} = require('../../domain-knowledge.js');

class AanwezigheidsForm extends React.Component {
    propTypes = {
        ondernemer     : PropTypes.object.isRequired,
        aanmeldingen   : PropTypes.array,
        sollicitaties  : PropTypes.array.isRequired,
        markten        : PropTypes.array.isRequired,
        query          : PropTypes.string,
        role           : PropTypes.string,
        csrfToken      : PropTypes.string,
    };

    render() {
        const {
            aanmeldingen = [],
            csrfToken,
            markten,
            ondernemer,
            role,
            sollicitaties
        } = this.props;

        // Door `offsetMins` bij de huidige tijd op te tellen, zal `startDate` naar morgen
        // gaan ipv vandaag als de huidige tijd voorbij indelingstijd ligt.
        const offsetMins = role !== 'marktmeester' ?
                           (( 24 * 60 ) - indelingstijdstipInMinutes()) :
                           0;
        const startDate  = getTimezoneTime()
                           .add(offsetMins, 'minutes')
                           .add(INDELING_DAG_OFFSET, 'days')
                           .format('YYYY-MM-DD');

        const aanmeldingenPerMarkt = markten.map(markt => {
            const aanmeldingenFiltered = filterRsvpList(
                aanmeldingen[markt.id].filter(aanmelding => aanmelding.marktId === markt.id),
                markt
            );

            const aanmeldingenPerWeek = aanmeldingenFiltered.reduce((result, { date, rsvp }) => {
                const week        = new Date(date) > new Date(endOfWeek()) ? 1 : 0;
                const attending   = rsvp ? rsvp.attending : isVast(sollicitaties[markt.id].status);
                const isInThePast = Date.parse(date) <= Date.now();

                result[week].push({
                    date,
                    attending,
                    isInThePast
                });

                return result;
            }, [[], []]);

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

            {aanmeldingenPerMarkt.map(({ markt, aanmeldingenPerWeek }) => (
            <>
                <h1 className="Heading Heading--intro">
                    Aanwezigheid {markt.naam}
                    <SollicitatieSpecs sollicitatie={sollicitaties[markt.id]} />
                </h1>

                {aanmeldingenPerWeek.map((week, i) => (
                <>
                <h3>{i === 0 ? 'Deze week' : 'Volgende week'}</h3>

                <div className="week">
                {week.map(({ date, attending, isInThePast }) => (
                    <span className="day" key={++index}>
                        <input type="hidden" name={`rsvp[${index}][marktId]`} defaultValue={markt.id} />
                        <input type="hidden" name={`rsvp[${index}][marktDate]`} defaultValue={date} />

                        <input
                            disabled={isInThePast}
                            id={`rsvp-${index}`}
                            name={`rsvp[${index}][attending]`}
                            type="checkbox"
                            defaultValue="true"
                            defaultChecked={attending}
                        />
                        <label htmlFor={`rsvp-${index}`}>
                            <strong>{formatDayOfWeekShort(date)}</strong>
                        </label>
                    </span>
                ))}
                </div>
                </>
                ))}
            </>
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
