import * as React from 'react';
import OndernemerStatus from './OndernemerStatus.jsx';
import PrintableBackground from './PrintableBackground.jsx';
import PropTypes from 'prop-types';
import { IMarktplaats, IMarktondernemer, IRSVP, IToewijzing } from '../../markt.model';

const Plaats = ({
    plaats,
    vph,
    ondernemer,
    first,
    toewijzing,
    type,
    color,
    opUitgebreid,
    opGewisseld,
    opAfgemeld,
    opAfgemeldPeriode,
    ondernemerUitgebreid,
    ondernemerGewisseld
}: {
    plaats: IMarktplaats;
    vph?: IMarktondernemer;
    ondernemer?: IMarktondernemer;
    first?: boolean;
    toewijzing?: IToewijzing;
    type?: string;
    color?: string;
    opUitgebreid?: boolean;
    opGewisseld?: boolean;
    opAfgemeld?: boolean;
    opAfgemeldPeriode?: boolean;
    ondernemerUitgebreid?: boolean;
    ondernemerGewisseld?: boolean;
}) => {
    const plaatsProps = (plaats.properties || [])
                        .filter(word => !['dubble'].includes(word))
                        .reverse();
    const tags = (plaats.properties || []).filter(word =>
        ['experimentele-zone', 'standwerkersplaats', 'eigen-materiaal'].includes(word)
    );
    const voorkeur = vph && vph.voorkeur;

    return (
        <tr
            className={
                `Plaats ${first && 'Plaats--first'} ${tags.join(' ')} ${opAfgemeld || opAfgemeldPeriode? ' Plaats--vph-attendance-not-attending': null }`
            }
            data-sollicitatie-nummer={vph && vph.sollicitatieNummer}
        >
            <td className="Plaats__prop Plaats__prop-properties">
                <span className={`icon icon-${plaatsProps ? plaatsProps[0] : ''}`} />
            </td>
            <td className="Plaats__prop Plaats__prop-plaats-nr" style={{ backgroundColor: color || 'transparent' }}>
                {plaats.plaatsId}
            </td>
            <td className="Plaats__prop Plaats__prop-soll Plaats__prop-vph">
                {opUitgebreid ? <div className="Plaats__prop__icon Icon Icon--plus"></div> : null }
                {opGewisseld ? <div className="Plaats__prop__icon Icon Icon--wissel"></div> : null }
                {opAfgemeld ? <div className="Plaats__prop__icon Icon Icon--unchecked" ></div> : null }
                {opAfgemeldPeriode ? <div className="Plaats__prop__icon"><img src="/images/Calendar.svg" alt="Unchecked"/></div> : null}
                <span id={`soll-${vph && vph.sollicitatieNummer}`} />
                {vph ? (
                    <a href={`/profile/${vph.erkenningsNummer}`}>
                        <strong>{vph.sollicitatieNummer}</strong>
                    </a>
                ) : null}
            </td>
            <td className="Plaats__prop Plaats__prop-naam Plaats__prop-vph-description">
                {vph ? vph.description : <strong>{tags.join(' ')}</strong>}
            </td>
            <td className="Plaats__prop Plaats__prop-soll">
                {ondernemerUitgebreid ? <div className="Plaats__prop__icon Icon Icon--plus"></div> : null }
                {ondernemerGewisseld ? <div className="Plaats__prop__icon Icon Icon--wissel"></div> : null }
                {type === 'wenperiode' && voorkeur ? <strong>({voorkeur.minimum ?
                voorkeur.minimum : voorkeur.maximum}, {voorkeur.minimum ?
                voorkeur.maximum - voorkeur.minimum : 0})</strong> : ''}{ondernemer ? (
                    <a href={`/profile/${toewijzing.erkenningsNummer}`}>
                        <strong>{ondernemer.sollicitatieNummer}</strong>
                    </a>
                ) : null}
            </td>
            <td className="Plaats__prop Plaats__prop-naam">
                {ondernemer ? ondernemer.description : null}
            </td>
            <td className="Plaats__prop Plaats__prop-status">
                {ondernemer ? <OndernemerStatus status={ondernemer.status} /> : null}
            </td>
        </tr>
    );
};

export default Plaats;
