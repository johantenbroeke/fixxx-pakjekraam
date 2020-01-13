const React = require('react');
const PropTypes = require('prop-types');
const { yyyyMmDdtoDDMMYYYY } = require('../../util.ts');
const Form = require('./Form');
const SollicitatieSpecs = require('./SollicitatieSpecs');
const { getDefaultVoorkeur } = require('../../model/voorkeur.functions');

class AlgemeneVoorkeurenForm extends React.Component {
    propTypes = {
        marktId: PropTypes.string,
        marktDate: PropTypes.string,
        ondernemer: PropTypes.object.isRequired,
        markt: PropTypes.object,
        voorkeur: PropTypes.array,
        branches: PropTypes.array.isRequired,
        next: PropTypes.string,
        query: PropTypes.string,
        role: PropTypes.string,
        csrfToken: PropTypes.string,
    };

    render() {
        const { branches, ondernemer, markt, marktId, marktDate, role, csrfToken } = this.props;
        const sollicitatie = ondernemer.sollicitaties.find(soll => soll.markt.id === markt.id && !soll.doorgehaald);

        const voorkeur = this.props.voorkeur || getDefaultVoorkeur(sollicitatie);

        if (voorkeur.absentFrom) {
            voorkeur.absentFrom = yyyyMmDdtoDDMMYYYY(voorkeur.absentFrom);
        }

        if (voorkeur.absentUntil) {
            voorkeur.absentUntil = yyyyMmDdtoDDMMYYYY(voorkeur.absentUntil);
        }

        return (

            <Form csrfToken={csrfToken} className="Form--AlgemenevoorkeurenForm">
                { role === 'marktondernemer' ?
                    <SollicitatieSpecs sollicitatie={sollicitatie} markt={markt} /> : null
                }
                <h1 className="Heading Heading--intro">Marktprofiel {markt.naam}</h1>
                <div className="well well--max-width">
                    <div className="Fieldset">
                        <h2 className="Fieldset__header">Wat voor koopwaar verkoopt u?</h2>
                        <div className="InputField">
                            <div className="Select__wrapper">
                                <select id="brancheId" name="brancheId" className="Select">
                                    <option />
                                    {branches
                                        .map(branche => (
                                            <option
                                                key={branche.brancheId}
                                                value={branche.brancheId}
                                                selected={branche.brancheId === voorkeur.brancheId}
                                            >
                                                {branche.description}
                                            </option>
                                        ))}
                                </select>{' '}
                            </div>
                        </div>
                    </div>
                    <div className="Fieldset">
                        <h2 className="Fieldset__header">Hebt u een bakplaats nodig?</h2>
                        <p className="InputField InputField--checkbox">
                            <input
                                id="parentBrancheId"
                                type="checkbox"
                                name="parentBrancheId"
                                defaultValue="bak"
                                defaultChecked={voorkeur.parentBrancheId === 'bak'}
                            />
                            <label htmlFor="parentBrancheId">Ja, ik ga koken, bakken of frituren.</label>
                        </p>
                    </div>
                    <div className="Fieldset">
                        <h2 className="Fieldset__header">Wilt u met eigen materiaal staan?</h2>
                        <p className="InputField InputField--checkbox">
                            <input
                                id="inrichting"
                                type="checkbox"
                                name="inrichting"
                                defaultValue="eigen-materieel"
                                defaultChecked={voorkeur.inrichting === 'eigen-materieel'}
                            />
                            <label htmlFor="inrichting">Ja, ik kom met een eigen verkoopwagen/eigen materiaal.</label>
                        </p>
                    </div>
                    { role == 'marktmeester' ? (
                        <div className={`Fieldset Fieldset--highlighted`}>
                            <p className="Fieldset__highlight-text">Functie speciaal voor marktmeesters! Alleen aanpassen als je weet wat je doet.</p>
                            <h2 className="Fieldset__header">Langdurige afwezigheid</h2>
                            <p className="InputField  InputField--text">
                                <label className="Label" htmlFor="absentFrom">Afwezig vanaf (dd-mm-yyyy): </label>
                                <input
                                    id="absentFrom"
                                    type="text"
                                    name="absentFrom"
                                    placeholder="dd-mm-yyyy"
                                    className="Input Input--medium"
                                    value={voorkeur.absentFrom}
                                />
                            </p>
                            <p className="InputField InputField--text">
                                <label className="Label" htmlFor="absentUntil">Afwezig tot en met (dd-mm-yyyy):</label>
                                <input
                                    id="absentUntil"
                                    type="text"
                                    name="absentUntil"
                                    placeholder="dd-mm-yyyy"
                                    className="Input Input--medium"
                                    value={voorkeur.absentUntil}
                                />
                            </p>
                        </div>
                    ) : null }
                </div>

                <div className="Fieldset">
                    <p className="InputField InputField--submit">
                        <input
                            id="erkenningsNummer"
                            type="hidden"
                            name="erkenningsNummer"
                            defaultValue={ondernemer.erkenningsnummer}
                        />
                        <input type="hidden" name="marktId" defaultValue={marktId} />
                        <input type="hidden" name="marktDate" defaultValue={marktDate} />
                        <input type="hidden" name="anywhere" defaultValue={voorkeur.anywhere} />
                        <input type="hidden" name="minimum" defaultValue={voorkeur.minimum} />
                        <input type="hidden" name="maximum" defaultValue={voorkeur.maximum} />
                        <a
                            className="Button Button--tertiary"
                            href={`${
                                role === 'marktmeester'
                                    ? `/profile/${ondernemer.erkenningsnummer}`
                                    : `/markt-detail/${markt.id}#marktprofiel`
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
                                    ? `/profile/${ondernemer.erkenningsnummer}?error=algemene-voorkeuren-saved`
                                    : `/markt-detail/${markt.id}?error=algemene-voorkeuren-saved#marktprofiel`
                            }`}
                        >
                            Bewaar
                        </button>

                    </p>
                </div>
            </Form>
        );
    }
}
module.exports = AlgemeneVoorkeurenForm;
