import * as React from 'react';
import PrintableBackground from './PrintableBackground.jsx';
import PropTypes from 'prop-types';
import {
    IBranche,
    IMarktplaats,
    IMarktondernemer,
    IRSVP,
    IToewijzing
} from '../../markt.model';

const Plaats = ({
    plaats,
    branches,
    vph,
    ondernemer,
    first,
    toewijzing,
    type,
    opUitgebreid,
    opGewisseld,
    opAfgemeld,
    opAfgemeldPeriode,
    ondernemerUitgebreid,
    ondernemerGewisseld
}: {
    plaats: IMarktplaats;
    branches?: IBranche[];
    vph?: IMarktondernemer;
    ondernemer?: IMarktondernemer;
    first?: boolean;
    toewijzing?: IToewijzing;
    type?: string;
    opUitgebreid?: boolean;
    opGewisseld?: boolean;
    opAfgemeld?: boolean;
    opAfgemeldPeriode?: boolean;
    ondernemerUitgebreid?: boolean;
    ondernemerGewisseld?: boolean;
}) => {
    const plaatsProps = plaats.properties;
    // `realBranche` om duidelijk te maken dat 'bak' niet als een echte branche gezien
    // wordt.
    const realBranche = branches.find(branche => branche.brancheId !== 'bak');
    const wilBakken   = branches.find(branche => branche.brancheId === 'bak');
    const color       = realBranche ? realBranche.color : null;
    const tags        = (plaats.properties || []).filter(word =>
        ['experimentele-zone', 'standwerkersplaats', 'eigen-materiaal'].includes(word)
    );
    const voorkeur    = vph && vph.voorkeur;

    return (
        <tr
            className={`
                Plaats ${first && 'Plaats--first'} ${tags.join(' ')}
                ${opAfgemeld || opAfgemeldPeriode ? ' Plaats--vph-attendance-not-attending': null }
            `}
            data-sollicitatie-nummer={vph && vph.sollicitatieNummer}
        >
            <td className="Plaats__prop Plaats__prop-properties">
                <span className={`icon icon-${plaatsProps ? plaatsProps[0] : ''}`} />
            </td>
            <td className="Plaats__prop Plaats__prop-plaats-nr">
                {plaats.plaatsId}
            </td>
            <td
                className={`Plaats__prop Plaats__prop-branche autoColor ${wilBakken ? 'bak' : ''}`}
                style={{ backgroundColor: color || 'transparent' }}
            >
                {realBranche ? realBranche.number : null}
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
            <td className="Plaats__prop Plaats__prop-naam">
                <div>{vph ? vph.description : <strong>{tags.join(' ')}</strong>}</div>
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
                <div>{ondernemer ? ondernemer.description : null}</div>
            </td>
            <td className={`Plaats__prop Plaats__prop-status Plaats__prop-status--${ondernemer ? ondernemer.status : 'none'}`}>
                {ondernemer ? ondernemer.status : null}
            </td>
        </tr>
    );
};

export default Plaats;
