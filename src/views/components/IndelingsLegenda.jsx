const PropTypes = require('prop-types');
const React = require('react');

const {
    isVast
} = require('../../domain-knowledge');

const IndelingsLegenda = ({
    branches,
    marktplaatsen,
    ondernemers,
    aanmeldingen,
    toewijzingen
}) => {
    const relevantBranches     = getAllBranchesForLegend(branches, marktplaatsen);
    const indelingenPerBranche = toewijzingen.length ?
                                 countToewijzingenPerBranche(relevantBranches, toewijzingen) :
                                 {};
                                 // countAanmeldingenPerBranche(relevantBranches, ondernemers, aanmeldingen);
    const showToewijzingen     = !!toewijzingen.length;

    return (
        <div className="IndelingsLegenda">
            <table>
                <thead>
                <tr>
                    <th className="color">Kleur</th>
                    <th>Beschrijving</th>
                    <th>Maximum</th>
                    {showToewijzingen && <th>Toegewezen</th>}
                </tr>
                </thead>

                <tbody>
            {relevantBranches.map((branche, i) =>
                <tr key={i}>
                    <td style={{ backgroundColor: branche.color || 'transparent' }}></td>
                    <td>{branche.description}</td>
                    <td className={!branche.maximumPlaatsen ? 'nvt' : ''}>{branche.maximumPlaatsen || '—'}</td>
                    {showToewijzingen && <td>{indelingenPerBranche[branche.brancheId] || 0}</td>}
                </tr>
            )}
                </tbody>
            </table>
        </div>
    );
};

IndelingsLegenda.propTypes = {
    branches: PropTypes.array.isRequired,
    marktplaatsen: PropTypes.array.isRequired,
    ondernemers: PropTypes.array.isRequired,
    aanmeldingen: PropTypes.array,
    toewijzingen: PropTypes.array
};

const _isRelevantBrancheForLegend = (marktplaatsen, branche) => {
    const brancheId         = branche.brancheId;
    const relevantForLegend = true; /* branche.maximumPlaatsen ||
                              branche.maximumToewijzingen ||
                              branche.verplicht; */
    if (!relevantForLegend) {
        return result;
    }

    return !!marktplaatsen.find(({ branches }) =>
        // branches && branches.includes(brancheId)
        branches && branches[0] === brancheId
    );
};

const _countPlaatsenPerBranche = (allBranches, marktplaatsen) => {
    return marktplaatsen.reduce((result, marktplaats) => {
        const brancheId = marktplaats.branches ?
                          marktplaats.branches[0] :
                          null;

        if (brancheId) {
            result[brancheId] = result[brancheId] || 0;
            result[brancheId]++;
        }

        return result;
    }, {});
};

const getAllBranchesForLegend = (allBranches, marktplaatsen) => {
    return allBranches
    .reduce((result, branche) => {
        return _isRelevantBrancheForLegend(marktplaatsen, branche) ?
               result.concat(branche) :
               result;
    }, [])
    .sort((a, b) =>
        String(a.description).localeCompare(b.description, { sensitivity: 'base' })
    );
};

const countToewijzingenPerBranche = (allBranches, toewijzingen) => {
    const toegewezenPlaatsen = toewijzingen.reduce((result, toewijzing) => {
        return result.concat(toewijzing.plaatsen);
    }, []);
    return _countPlaatsenPerBranche(allBranches, toegewezenPlaatsen);
};

const countAanmeldingenPerBranche = (allBranches, ondernemers, aanmeldingen) => {
    const vastePlaatsen = aanmeldingen.reduce((result, aanmelding) => {
        const ondernemer = ondernemers.find(({ erkenningsNummer }) =>
            erkenningsNummer === aanmelding.erkenningsNummer
        );

        return ondernemer && isVast(ondernemer) ?
               result.concat(ondernemer.plaatsen || []) :
               result;
    }, []);
    return _countPlaatsenPerBranche(allBranches, vastePlaatsen);
};

module.exports = IndelingsLegenda;
