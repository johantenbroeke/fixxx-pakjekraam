const PropTypes = require('prop-types');
const React = require('react');

const {
    ondernemerIsAfgemeld,
    ondernemerIsAfgemeldPeriode,
    vphIsGewisseld,
    vphIsUitgebreid
} = require('../../model/ondernemer.functions');

const ObstakelList = require('./ObstakelList');
const Plaats = require('./Plaats.tsx').default;

const IndelingslijstGroup = ({
    page,
    plaatsList,
    vphl,
    obstakelList,
    markt,
    ondernemers,
    aanmeldingen,
    toewijzingen = [],
    datum,
    branches,
}) => {
    let first = true;

    const classes = page.class.split(' ').map(cl => {
        return 'IndelingslijstGroup--markt-' + markt.id + ' IndelingslijstGroup--' + cl.trim();
    });

    return (
        <div className={'IndelingslijstGroup ' + classes}>
            <h4 className="IndelingslijstGroup__title">{page.title}</h4>
            {page.landmarkTop && (
                <p className="IndelingslijstGroup__landmark IndelingslijstGroup__landmark-top">{page.landmarkTop}</p>
            )}

            <table className="IndelingslijstGroup__table" cellPadding="0" cellSpacing="0">
                <thead>
                    <tr>
                        <th className="Plaats__prop Plaats__prop-properties"></th>
                        <th className="Plaats__prop">nr.</th>
                        <th className="Plaats__prop">
                            br.
                        </th>
                        <th className="Plaats__prop">
                            vph
                        </th>
                        <th className="Plaats__prop" />
                        <th className="Plaats__prop" />
                        <th className="Plaats__prop" />
                        <th className="Plaats__prop" />
                    </tr>
                </thead>
                <tbody className="IndelingslijstGroup__wrapper">
                    {page.plaatsList.map((plaatsNr, i) => {
                        let originelePlaatshouder = vphl[plaatsNr];
                        let voorkeurOp = null;

                        if (originelePlaatshouder) {
                            originelePlaatshouder = ondernemers.find(ondernemer =>
                                ondernemer.erkenningsNummer == originelePlaatshouder.erkenningsNummer
                            );
                            voorkeurOp = originelePlaatshouder.voorkeur;
                        }

                        const aanmeldingVph = originelePlaatshouder ?
                                              aanmeldingen.find(rsvp => rsvp.erkenningsNummer === originelePlaatshouder.erkenningsNummer) :
                                              null;

                        const toewijzing = toewijzingen.find(({ plaatsen }) => plaatsen.includes(plaatsNr));

                        const ingedeeldeOndernemer = toewijzing ? ondernemers.find(
                            ({ erkenningsNummer }) => erkenningsNummer === toewijzing.erkenningsNummer,
                        ) : null;

                        const plaats         = plaatsList[plaatsNr];
                        const plaatsBranches = plaats.branches ?
                                               branches.filter(branche => plaats.branches.includes(branche.brancheId)) :
                                               [];
                        const plaatsProps = {
                            key: plaatsNr,
                            first,
                            plaats,
                            branches: plaatsBranches,
                            obstakels: obstakelList,
                            ondernemer: ingedeeldeOndernemer,
                            vph: originelePlaatshouder,
                            opUitgebreid: originelePlaatshouder && toewijzingen ? vphIsUitgebreid(originelePlaatshouder, toewijzingen) : false,
                            opGewisseld: originelePlaatshouder && toewijzingen ? vphIsGewisseld(originelePlaatshouder, toewijzingen) : false,
                            opAfgemeld: aanmeldingVph ? ondernemerIsAfgemeld(originelePlaatshouder, [aanmeldingVph], datum) : false,
                            opAfgemeldPeriode: originelePlaatshouder && voorkeurOp ? ondernemerIsAfgemeldPeriode(voorkeurOp, datum) : false,
                            ondernemerUitgebreid: ingedeeldeOndernemer && ingedeeldeOndernemer.status == 'vpl' ? vphIsUitgebreid(ingedeeldeOndernemer, toewijzingen) : false,
                            ondernemerGewisseld: ingedeeldeOndernemer && ingedeeldeOndernemer.status == 'vpl' ? vphIsGewisseld(ingedeeldeOndernemer, toewijzingen) : false,
                            aanmelding: aanmeldingVph,
                            markt,
                            datum,
                            toewijzing
                        };

                        if (plaatsList[plaatsNr]) {
                            if (obstakelList[plaatsNr] && obstakelList[plaatsNr].length > 0) {
                                return (
                                    <React.Fragment key={plaatsNr}>
                                        <Plaats {...plaatsProps} />
                                        <ObstakelList obstakelList={obstakelList[plaatsNr]} />
                                        {(first = true)}
                                    </React.Fragment>
                                );
                            } else {
                                return (
                                    <React.Fragment key={plaatsNr}>
                                        <Plaats {...plaatsProps} />
                                        {(first = false)}
                                    </React.Fragment>
                                );
                            }
                        } else {
                            return <Plaats key={i} />;
                        }
                    })}
                </tbody>
            </table>
            {page.landmarkBottom && (
                <p className="IndelingslijstGroup__landmark IndelingslijstGroup__landmark-bottom">
                    {page.landmarkBottom}
                </p>
            )}
        </div>
    );
};

IndelingslijstGroup.propTypes = {
    aanmeldingen: PropTypes.array.isRequired,
    toewijzingen: PropTypes.array,
    page: PropTypes.object,
    plaatsList: PropTypes.object,
    vphl: PropTypes.object,
    obstakelList: PropTypes.object,
    ondernemers: PropTypes.array.isRequired,
    markt: PropTypes.object.isRequired,
    datum: PropTypes.string,
    branches: PropTypes.array.isRequired
};

module.exports = IndelingslijstGroup;
