const React = require('react');
const PropTypes = require('prop-types');
const { formatOndernemerName, plaatsSort, isVast } = require('../../domain-knowledge.js');
const { flatten } = require('../../util.ts');
const MarktplaatsSelect = require('./MarktplaatsSelect');
const Button = require('./Button');
const Form = require('./Form');


class PlaatsvoorkeurenForm extends React.Component {
    propTypes = {
        plaatsvoorkeuren: PropTypes.array.isRequired,
        markt: PropTypes.object.isRequired,
        ondernemer: PropTypes.object.isRequired,
        indelingVoorkeur: PropTypes.object,
        marktDate: PropTypes.string,
        rows: PropTypes.array.isRequired,
        role: PropTypes.string,
        query: PropTypes.string,
        sollicitatie: PropTypes.object.isRequired,
        csrfToken: PropTypes.string,
    };

    render() {
        const { markt, ondernemer, plaatsvoorkeuren, query, rows, indelingVoorkeur, marktDate, role, sollicitatie, csrfToken } = this.props;

        const defaultVoorkeur = {
            minimum: isVast(sollicitatie.status) ? sollicitatie.vastePlaatsen.length : 1,
            maximum: isVast(sollicitatie.status) ? sollicitatie.vastePlaatsen.length : 1,
            anywhere: !isVast(sollicitatie.status),
            inactive: false,
        };

        const voorkeur = indelingVoorkeur || defaultVoorkeur;

        const voorkeurEntries = plaatsvoorkeuren.map((voork, index) => {
            return {
                marktId: voork.marktId,
                erkenningsNummer: voork.erkenningsNummer,
                plaatsId: voork.plaatsId,
                priority: voork.priority + 1,
                readonly: false,
                newItem: false,
            };
        });

        const allEntries = [...voorkeurEntries].map((entry, index) => ({
            ...entry,
            index,
        }));

        let minimumCount = null;

        if (role === 'marktmeester') {
            minimumCount =
                sollicitatie.vastePlaatsen.length > 0
                    ? sollicitatie.vastePlaatsen.length + 2
                    : 3;
        } else {
            minimumCount =
                sollicitatie.vastePlaatsen.length > 0
                    ? sollicitatie.vastePlaatsen.length
                    : 3;
        }

        const minimumDisabled = sollicitatie.status === 'vpl' && role !== 'marktmeester';

        const minimumChecked = i => {
            if (isVast(sollicitatie.status) && role !== 'marktmeester') {
                if (sollicitatie.vastePlaatsen.length === i + 1) {
                    return true;
                } else {
                    return false;
                }
            } else if (voorkeur.minimum === i + 1) {
                return true;
            } else {
                return false;
            }
        };

        const defaultCheckedMax = i => {
            if ((voorkeur.maximum - voorkeur.minimum) === i) {
                return true;
            } else {
                return false;
            }
        };

        const plaatsenDuiding = plaatsen => {
            return plaatsen.length > 1 ? 'plaatsen' : 'plaats';
        };

        const plaatsNummerDuiding = plaatsen => {
            return plaatsen.length > 1 ? 'plaatsnummers' : 'plaatsnummer';
        };

        const entriesFiltered = allEntries.filter(entry => entry.marktId === markt.id);
        const entriesSplit = entriesFiltered
            .sort((a, b) => b.priority - a.priority)
            .reduce((t, e) => {
                !t.includes(e.priority) && t.push(e.priority);
                return t;
            }, [])
            .reduce((t, p) => {
                t.push(entriesFiltered.filter(e => e.priority === p));
                return t;
            }, [])
            .map(entries => entries[0]);

        const plaatsSets = entriesSplit.map(entry => entry.plaatsId);

        const rowsFlat = rows
            .reduce((t, r) => {
                r.map(p => t.push(p)), [];
                return t;
            })
            .sort((a, b) => plaatsSort(a, b, 'plaatsId'))
            .map(plaats => {
                plaats.disabled = !plaatsSets.reduce((t, set) => t.concat(set), []).includes(plaats.plaatsId);
                return plaats;
            });
        const marktRowsJSOM = () => {
            return { __html: 'var marktRows = ' + JSON.stringify(rows) + ';' };
        };
        const plaatsSetsJSON = () => {
            return { __html: 'var plaatsenSets = ' + JSON.stringify(plaatsSets) + ';' };
        };
        const marktRowsFlatJSOM = () => {
            return {
                __html: 'var marktRowsFlat = ' + JSON.stringify(rowsFlat) + ';',
            };
        };

        const isMarktmeesterEnVph = (role === 'marktmeester' && isVast(sollicitatie.status));

        return (
            <Form
                className="Form Form--PlaatsvoorkeurenForm"
                csrfToken={csrfToken}
                // dataAttributes={[
                //     { 'vasteplaats-count':'voorkeur-form' },
                // ]}
                decorator="voorkeur-form"
            >
                <input
                    id="erkenningsNummer"
                    type="hidden"
                    name="erkenningsNummer"
                    defaultValue={ondernemer.erkenningsnummer}
                />

                <div className="PlaatsvoorkeurenForm__markt" data-markt-id={markt.id}>
                    <script dangerouslySetInnerHTML={marktRowsJSOM()} />
                    <script dangerouslySetInnerHTML={plaatsSetsJSON()} />
                    <input name="maximum" id="maximum" type="hidden" defaultValue={voorkeur.maximum} />
                    {/* { isVast(sollicitatie.status) ?
                        <input name="minimum" id="minimum" type="hidden" defaultValue={sollicitatie.vastePlaatsen.length} />
                        : null
                    } */}
                    <div className={"Fieldset PlaatsvoorkeurenForm__plaats-count " + (isMarktmeesterEnVph ? 'Fieldset--highlighted' : null)}>
                        {isMarktmeesterEnVph ?
                            <p className="Fieldset__highlight-text">Verouderde functie! Alleen aanpassen als je weet wat je doet.</p> : null
                        }
                        <h2 className="Fieldset__header">
                            {isVast(sollicitatie.status) ? `Uw vaste ${plaatsenDuiding(sollicitatie.vastePlaatsen)}` : 'Aantal plaatsen'}
                        </h2>
                        <span className="Fieldset__sub-header">
                            {isVast(sollicitatie.status)
                                ? `${plaatsNummerDuiding(sollicitatie.vastePlaatsen)}: ${sollicitatie.vastePlaatsen.join(', ')}`
                                : <span>Hoeveel plaatsen hebt u <strong>echt nodig</strong>?</span>
                            }
                        </span>

                        <div className="PlaatsvoorkeurenForm__plaats-count__wrapper">
                            {Array.from(new Array(minimumCount)).map((r, i) => (
                                <React.Fragment key={i}>
                                    <input
                                        type="radio"
                                        id={`default-count-${i + 1}`}
                                        value={`${i + 1}`}
                                        data-val={`${i + 1}`}
                                        name="minimum"
                                        disabled={minimumDisabled}
                                        {...{ defaultChecked: minimumChecked(i) }}
                                    />
                                    <label htmlFor={`default-count-${i + 1}`}>{i + 1}</label>
                                </React.Fragment>
                            ))}
                        </div>

                    </div>

                    <div className="Fieldset PlaatsvoorkeurenForm__plaats-count extra">
                        <h2 className="Fieldset__header">Extra plaatsen</h2>
                        <span className="Fieldset__sub-header">
                            Hoeveel <strong>extra</strong> plaatsen wilt u daar nog bij - als er genoeg plek is?
                        </span>
                        <div className="PlaatsvoorkeurenForm__plaats-count__wrapper extra">
                            {['geen', '1', '2'].map((r, i) => (
                                <React.Fragment key={i}>
                                    <input
                                        type="radio"
                                        id={`extra-count-${i}`}
                                        value={`${i}`}
                                        name="extra-count"
                                        {...{ defaultChecked: defaultCheckedMax(i) }}
                                    />
                                    <label htmlFor={`extra-count-${i}`}>
                                        {i !== 0 ? '+' : ''}
                                        {r}
                                    </label>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="Fieldset">
                        <h2 className="Fieldset__header">Plaatsvoorkeuren</h2>
                        <span className="Fieldset__sub-header">U kunt zoveel voorkeuren invullen als u wilt.</span>
                        <div className="PlaatsvoorkeurenForm__list">
                            {entriesSplit.map((entry, index, entriesArray) => (
                                <div className="Draggable-list-item" id="plaatsvoorkeuren-list-item" key={entry.id}>
                                    <div className="Draggable-list-item__left">
                                        <div className="Draggable-list-item__handle">
                                            <div className="Draggable-list-item__handle__bar"></div>
                                            <div className="Draggable-list-item__handle__bar"></div>
                                        </div>
                                        <span className="Draggable-list-item__label">
                                            Plaatsnummer: <strong>{entry.plaatsId}</strong>
                                        </span>
                                    </div>

                                    <input
                                        type="hidden"
                                        name={`plaatsvoorkeuren[${index}][marktId]`}
                                        defaultValue={entry.marktId}
                                    />
                                    <input
                                        type="hidden"
                                        name={`plaatsvoorkeuren[${index}][priority]`}
                                        defaultValue={entry.priority || entriesArray.length - n}
                                    />
                                    <input
                                        type="hidden"
                                        name={`plaatsvoorkeuren[${index}][plaatsId]`}
                                        value={entry.plaatsId}
                                    />
                                    <a   href="#"  data-handler="remove-voorkeur" className="Draggable-list-item__right">
                                        <span className="Draggable-list-item__delete">
                                        </span>
                                    </a>
                                </div>
                            ))}
                        </div>
                        <div
                            className="PlaatsvoorkeurenForm__prototype"
                            data-plaatsvoorkeur-count={minimumCount}
                            data-markt-id={markt.id}
                            // data-decorator="plaatsvoorkeur-prototype"
                            data-used-plaatsen={`p=${entriesFiltered.map(entry => entry.plaatsId).join('&p=')}`}
                            data-select-base-id={entriesFiltered.length}
                            data-max-uitbreidingen={1}
                        >
                            <div className="PlaatsvoorkeurenForm__list-item" id="plaatsvoorkeuren-list-item">
                                <h4 className="PlaatsvoorkeurenForm__list-item__heading Fieldset__sub-header">
                                    Voorkeur toevoegen
                                </h4>
                                <div className="well well--small">
                                    <span className="PlaatsvoorkeurenForm__list-item__label">Kies een marktplaats</span>
                                    <div className={`PlaatsvoorkeurenForm__list-item__wrapper`}>
                                        <input
                                            type="hidden"
                                            name={`plaatsvoorkeuren[${entriesFiltered.length + 1}][marktId]`}
                                            defaultValue={markt.id}
                                        />
                                        <input
                                            type="hidden"
                                            name={`plaatsvoorkeuren[${entriesFiltered.length + 1}][priority]`}
                                            defaultValue={2}
                                        />
                                        <MarktplaatsSelect
                                            name={`plaatsvoorkeuren[${entriesFiltered.length + 1}][plaatsId]`}
                                            id={`voorkeur-${entriesFiltered.length + 1}`}
                                            markt={markt}
                                            data={rowsFlat}
                                            optional={true}
                                        />
                                        <div className="PlaatsvoorkeurenForm__list-item__extra PlaatsvoorkeurenForm__list-item__min-extra" />
                                        <div className="PlaatsvoorkeurenForm__list-item__extra PlaatsvoorkeurenForm__list-item__optional" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {Array.from(new Array(0)).map((r, i) => (
                            <div
                                className="PlaatsvoorkeurenForm__prototype ghost"
                                data-plaatsvoorkeur-count={newPlaatsvoorkeurCount}
                                data-markt-id={markt.id}
                                // data-decorator="plaatsvoorkeur-prototype"
                                data-used-plaatsen={`p=${entriesFiltered.map(entry => entry.plaatsId).join('&p=')}`}
                                data-select-base-id={entriesFiltered.length}
                                data-max-uitbreidingen={1}
                                key={i}
                            >
                                <div className="PlaatsvoorkeurenForm__list-item">
                                    <h4 className="PlaatsvoorkeurenForm__list-item__heading">
                                        {entriesSplit.length + (i + 2)}e voorkeur
                                    </h4>
                                    <div className="well">
                                        <span className="PlaatsvoorkeurenForm__list-item__label">
                                            Kies een marktplaats
                                        </span>
                                        <div className={`PlaatsvoorkeurenForm__list-item__wrapper`}>
                                            <MarktplaatsSelect
                                                name={`plaatsvoorkeuren[${entriesFiltered.length + 1}][plaatsId]`}
                                                id={`voorkeur-${entriesFiltered.length + 1}`}
                                                markt={markt}
                                                data={rowsFlat}
                                                optional={true}
                                                readonly="disabled"
                                            />
                                            <div className="PlaatsvoorkeurenForm__list-item__extra PlaatsvoorkeurenForm__list-item__min-extra" />
                                            <div className="PlaatsvoorkeurenForm__list-item__extra PlaatsvoorkeurenForm__list-item__optional" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Dit veld willen we alleen laten zien aan marktmeesters en sollicitanten */}
                        {role == 'marktmeester' || !isVast(sollicitatie.status) ? (
                            <div className={`Fieldset ${isMarktmeesterEnVph ? 'Fieldset--highlighted' : null}`}>
                                {isMarktmeesterEnVph ?
                                    <p className="Fieldset__highlight-text">Verouderde functie! Alleen aanpassen als je weet wat je doet.</p> : null
                                }
                                <h2 className="Fieldset__header">
                                    Flexibel indelen?
                                    <br />
                                    Dan deelt het systeem u in op beschikbare plaatsen.
                                </h2>
                                <p className="InputField InputField--checkbox">
                                    <input
                                        id="anywhere"
                                        type="checkbox"
                                        name="anywhere"
                                        defaultChecked={voorkeur.anywhere}
                                    />
                                    <label htmlFor="anywhere">
                                        {isVast(sollicitatie.status) ? (
                                            <span>
                                                Ja, ik wil liever kunnen vergroten dan alleen op mijn eigen plaats(en)
                                                staan.
                                            </span>
                                        ) : (
                                                <span>
                                                    Als mijn voorkeursplaatsen niet beschikbaar zijn, wil ik automatisch op een
                                                    losse plaats ingedeeld worden.
                                            </span>
                                            )}
                                    </label>
                                </p>
                            </div>
                        ) : null}
                    </div>

                    <p className="InputField InputField--submit" id="bottom-buttons">
                        <button
                            className="Button Button--secondary"
                            type="submit"
                            name="redirectTo"
                            value={`${
                                role === 'marktmeester'
                                    ? `/profile/${ondernemer.erkenningsnummer}?error=plaatsvoorkeuren-saved`
                                    : `/markt-detail/${markt.id}?error=plaatsvoorkeuren-saved#plaatsvoorkeuren`
                                }`}
                        >
                            Bewaar
                        </button>
                        <Button
                            label="Annuleer"
                            href={
                                role === 'marktmeester'
                                    ? `/profile/${ondernemer.erkenningsnummer}`
                                    : `/markt-detail/${markt.id}#plaatsvoorkeuren`
                            }
                            type="tertiary"
                        />
                    </p>
                </div>
            </Form>
        );
    }
}

module.exports = PlaatsvoorkeurenForm;
