const Form = require('./Form');
const React = require('react');
const PropTypes = require('prop-types');

const SollicitatieSpecs = require('./SollicitatieSpecs');
const Alert = require('./Alert');

import { Roles } from '../../authentication';

const {
    toDate,
    WEEK_DAYS_SHORT
} = require('../../util.ts');

class AanwezigheidsForm extends React.Component {
    propTypes = {
        ondernemer: PropTypes.object.isRequired,
        aanmeldingenPerMarktPerWeek: PropTypes.array,
        sollicitaties: PropTypes.array.isRequired,
        query: PropTypes.string,
        role: PropTypes.string,
        csrfToken: PropTypes.string,
        voorkeuren: PropTypes.array.isRequired,
    };

    render() {
        const {
            aanmeldingenPerMarktPerWeek = [],
            csrfToken,
            ondernemer,
            role,
            sollicitaties,
            voorkeuren
        } = this.props;

        // Wordt in de HTML gebruikt om de `rsvp` <input>s te nummeren.
        let index = -1;

        const getVoorkeurForMarkt = marktId => {
            return voorkeuren.find(voorkeur => {
                return voorkeur.marktId === marktId;
            });
        };

        const getVoorkeurenLink = markt => {
            let link;
            role === Roles.MARKTMEESTER ? link = `/ondernemer/${ondernemer.erkenningsnummer}/algemene-voorkeuren/${markt.id}/` : link = `/algemene-voorkeuren/${markt.id}/`;
            return link;
        };

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
                        { !getVoorkeurForMarkt(markt.id) || !getVoorkeurForMarkt(markt.id).brancheId ? (
                        <Alert type="error" inline={true} fullwidth={true}>
                            <span>
                                U hebt uw <strong>koopwaar</strong> nog niet doorgegeven in het {' '}
                                <a href={getVoorkeurenLink(markt)}>marktprofiel</a>, daarom kunt u zich niet aanmelden voor deze markt.
                            </span>
                        </Alert> ) : null }
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
                                                disabled={week[day].isInThePast} defaultValue={toDate(week[day].date)}
                                            />

                                            <input
                                                type="checkbox"
                                                id={`rsvp-${index}`}
                                                name={`rsvp[${index}][attending]`}
                                                disabled={
                                                    week[day].isInThePast
                                                    || (!getVoorkeurForMarkt(markt.id) || !getVoorkeurForMarkt(markt.id).brancheId)
                                                }
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
                        href={`${role === 'marktmeester'
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
                        value={`${role === 'marktmeester'
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
