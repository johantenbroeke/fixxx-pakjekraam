const Button = require('./Button');
const PropTypes = require('prop-types');
const React = require('react');
const { formatDayOfWeek, formatDate, relativeHumanDay, endOfWeek, today } = require('../../util.ts');
const HeaderTitleButton = require('./HeaderTitleButton');
const Alert = require('./Alert');

const OndernemerMarktAanwezigheid = ({ rsvpEntries, sollicitatie, disabled, markt }) => {
    const blockUrl = `../../aanwezigheid/`;
    const weekAanmeldingen = rsvpEntries.reduce(
        (t, { date, rsvp }, i) => {
            const week = new Date(date) > new Date(endOfWeek()) ? 1 : 0;
            const attending = rsvp ? rsvp.attending : sollicitatie.status === 'vkk' || sollicitatie.status === 'vpl';
            t[week].push([
                <span key={date}>
                    {relativeHumanDay(date) ? (
                        <strong>{relativeHumanDay(date)}</strong>
                    ) : (
                            <span>{formatDayOfWeek(date)}</span>
                        )}
                </span>,
                formatDate(date),
                <strong key={attending ? `aangemeld` : `afgemeld`} className="OndernemerMarktAanwezigheid__attending">
                    {attending ? `aangemeld` : `afgemeld`}
                </strong>,
                attending,
                date === today(),
            ]);

            return t;
        },
        [[], []],
    );

    const renderInner = () => {
        return (
            <div className={'well' + (disabled ? ' well--disabled' : '' )}>
                { disabled ? (
                    <Alert type="error" inline={true}>
                        <span>
                        U hebt uw <strong>koopwaar</strong> nog niet doorgegeven in het {' '}
                            <a href={`/algemene-voorkeuren/${markt.id}/`}>marktprofiel</a>, daarom kunt u zich niet aanmelden voor deze markt.
                        </span>
                    </Alert>
                ) : null }
                <span>Op welke dagen staat er iemand (vergunninghouder of vervanger) in de kraam?</span>
                {weekAanmeldingen.map((week, i) => (
                    <div key={i}>
                        <span className="OndernemerMarktAanwezigheid__divider">
                            {i === 0 ? `Deze week` : `Volgende week`}
                        </span>
                        <ul className="OndernemerMarktAanwezigheid__list">
                            {week.map(day => (
                                <li
                                    key={day[1]}
                                    className={`OndernemerMarktAanwezigheid__list-item OndernemerMarktAanwezigheid__list-item--${day[3] ? 'attending' : 'not-attending'
                                        } ${day[4] ? `OndernemerMarktAanwezigheid__list-item--today` : ``}`}
                                >
                                    <span className="OndernemerMarktAanwezigheid__list-item-wrapper">
                                        <span className="OndernemerMarktAanwezigheid__week-day">{day[0]}</span>
                                        <span>
                                            <span className="OndernemerMarktAanwezigheid__date">{day[1]}</span>
                                            {day[2]}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="OndernemerMarktAanwezigheid background-link-parent" id="aanwezigheid">
            { disabled ? (
                <div className="box">
                    <HeaderTitleButton title="Aanwezigheid" buttonDisabled={true} />
                    { renderInner(true) }
                </div>
            ) : (
                <a href={blockUrl} className="background-link">
                    <HeaderTitleButton title="Aanwezigheid" url={blockUrl} />
                    { renderInner(false)}
                </a>
            )}
        </div >
    );
};

OndernemerMarktAanwezigheid.propTypes = {
    sollicitatie: PropTypes.object,
    markt: PropTypes.object,
    rsvpEntries: PropTypes.array,
    toewijzingen: PropTypes.array,
    disabled: PropTypes.bool,
};

module.exports = OndernemerMarktAanwezigheid;
