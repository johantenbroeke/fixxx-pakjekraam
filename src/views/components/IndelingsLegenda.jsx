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
    const showToewijzingen     = !!toewijzingen.length;
    const indelingenPerBranche = showToewijzingen ?
                                 countToewijzingenPerBranche(relevantBranches, ondernemers, toewijzingen) :
                                 {}; // countAanmeldingenPerBranche(relevantBranches, ondernemers, aanmeldingen);

    return (
        <div className="IndelingsLegenda">
            <table>
                <thead>
                <tr>
                    <th className="nr">Nr.</th>
                    <th>Beschrijving</th>
                    <th>Maximum</th>
                    {showToewijzingen && <th>Toegewezen</th>}
                </tr>
                </thead>

                <tbody>
            {relevantBranches.map((branche, i) =>
                <tr key={i}>
                    <td className="autoColor" style={{ backgroundColor: branche.color || 'transparent' }}>{branche.number}</td>
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
        if (!_isRelevantBrancheForLegend(marktplaatsen, branche)) {
            return result;
        }
        if (!branche.maximumPlaatsen && branche.verplicht) {
            const branchePlaatsen = marktplaatsen.filter(plaats =>
                plaats.branches && plaats.branches[0] === branche.brancheId
            );
            branche = { ...branche, maximumPlaatsen: branchePlaatsen.length };
        }
        return result.concat(branche);
    }, [])
    .sort((a, b) =>
        String(a.description).localeCompare(b.description, { sensitivity: 'base' })
    );
};

const countToewijzingenPerBranche = (allBranches, ondernemers, toewijzingen) => {
    return toewijzingen.reduce((result, toewijzing) => {
        // Als `IndelingslijstPage` wordt aangeroepen om een echt gedraaide indeling weer
        // te geven, dan worden de toewijzingen uit de database gehaald. Deze worden hierbij
        // niet verrijkt met de gegevens van de ondernemer (dit gebeurd bij een concept indeling
        // wel). Haal de ondernemergegevens in dit geval uit de `ondernemers` array.
        const ondernemer = toewijzing.ondernemer ||
                           ondernemers.find(({ erkenningsNummer }) =>
                             erkenningsNummer === toewijzing.erkenningsNummer
                           );
        const brancheId = ondernemer.voorkeur && ondernemer.voorkeur.branches &&
                          ondernemer.voorkeur.branches[0];

        if (brancheId) {
            result[brancheId] = result[brancheId] || 0;
            result[brancheId] += toewijzing.plaatsen.length;
        }

        return result;
    }, {});
};

module.exports = IndelingsLegenda;
