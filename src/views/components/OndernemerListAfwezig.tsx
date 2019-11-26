import PropTypes from 'prop-types';
import * as React from 'react';
import { IMarkt, IMarktondernemer, IRSVP } from '../../markt.model';
const moment = require('moment');

const OndernemerList = ({
    ondernemers,
    markt,
    aanmeldingen,
    plaatsvoorkeuren,
    algemenevoorkeuren,
}: {
    ondernemers: IMarktondernemer[];
    markt: IMarkt;
    aanmeldingen: IRSVP[];
    plaatsvoorkeuren: any;
    algemenevoorkeuren: any;
}) => (
    <div className="OndernemerList">
        <span className="OndernemerList__heading">Personen</span>
        <table className="OndernemerList__table">
            <tbody>
                {ondernemers.map(ondernemer => {
                    return (
                        // <h1>{ondernemer.erkenningsNummer}</h1>
                        <tr key={ondernemer.erkenningsNummer} className={ondernemer.status}>
                            <td>
                                <span id={`soll-${ondernemer.sollicitatieNummer}`} />
                                <a href={`/profile/${ondernemer.erkenningsNummer}`}>{ondernemer.sollicitatieNummer}</a>
                            </td>
                            <td>{ondernemer.status}</td>
                            <td>{ondernemer.description}</td>
                            { ondernemer.voorkeur.absentFrom && ondernemer.voorkeur.absentUntil ?
                                        <td className="small">
                                            <span className={`Pil Pil--${ondernemer.status}`}>
                                                { moment(ondernemer.voorkeur.absentFrom).format('DD-MM-YYYY') } <strong> t/m </strong> { moment(ondernemer.voorkeur.absentUntil).format('DD-MM-YYYY') }
                                            </span>
                                        </td> :
                                        <td></td>
                            }
                            {/* <td> <strong>({ondernemer.plaatsen.join(',')})</strong></td> */}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
);

OndernemerList.propTypes = {
    ondernemers: PropTypes.arrayOf(PropTypes.object),
    markt: PropTypes.object,
    aanmeldingen: PropTypes.array,
    plaatsvoorkeuren: PropTypes.object,
    algemenevoorkeuren: PropTypes.object,
};

module.exports = OndernemerList;
