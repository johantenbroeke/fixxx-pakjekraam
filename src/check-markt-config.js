const fs   = require('fs');
const path = require('path');

function flatten( a, b ) {
    a = Array.isArray(a) ? a : [a];
    b = Array.isArray(b) ? b : [b];
    return [...a, ...b];
}
function intersects( a, b ) {
    return !!a.find(value => b.includes(value));
}
function unique( a, b ) {
    return a.includes(b) ? a : [...a, b];
}

function readJSON( filePath ) {
    const data = fs.readFileSync(filePath, { encoding: 'utf8' });
    return JSON.parse(String(data));
}

const PROJECT_DIR = path.dirname(__dirname);
const SCHEMAS     = require('./markt-config.model.js');
const ROOTFILES   = [
    'config/markt/branches.json',
    'config/markt/obstakeltypes.json',
    'config/markt/plaatseigenschappen.json'
];
const MARKETFILES = [
    'branches.json',
    'geografie.json',
    'locaties.json',
    'markt.json',
    'paginas.json'
];
const INDEX       = {
    branches: indexAllBranches(`${PROJECT_DIR}/config/markt/branches.json`)
};

function run() {
    const marketSlugs = determineMarketsToValidate();
    let errors        = {};

    errors = checkRootFiles(errors, PROJECT_DIR);

    errors = marketSlugs.reduce((_errors, marketSlug) => {
        const marketPath = `${PROJECT_DIR}/config/markt/${marketSlug}`;
        return checkMarket(_errors, marketPath);
    }, errors);

    console.log(errors);
    process.exit(1);
}

function validateFile(
    errors,
    filePath,
    schema,
    extraValidation = null, // function
    required = true
) {
    let result;
    try {
        const data = readJSON(filePath);

        result = schema(data).errors.map(error => error.stack);
        if (typeof extraValidation === 'function') {
            result = extraValidation(result, data);
        }
    } catch (e) {
        result = required ? ['File not found'] : [];
    }

    return {
        ...errors,
        [filePath]: result
    };
}

function checkRootFiles( errors ) {
    errors = validateFile(
        errors,
        `${PROJECT_DIR}/config/markt/branches.json`,
        SCHEMAS.AllBranches
    );

    return errors;
}

function checkMarket( errors, marketPath ) {
    for (const fileName of MARKETFILES) {
        errors = VALIDATORS[fileName](errors, `${marketPath}/${fileName}`);
    }
    return errors;
}
const VALIDATORS = {
    'branches.json': function( errors, filePath ) {
        function validate( result, marketBranches ) {
            return marketBranches.reduce((_result, { id }) => {
                return !INDEX.branches.includes(id) ?
                       _result.concat([`brancheId not found in config/markt/branches.json: ${id}`]) :
                       _result;
            }, result);
        }

        return validateFile(errors, filePath, SCHEMAS.MarketBranches, validate, false);
    },
    'geografie.json': function( errors, filePath ) {
        return errors;
    },
    'locaties.json': function( errors, filePath ) {
        return errors;
    },
    'markt.json': function( errors, filePath ) {
        return errors;
    },
    'paginas.json': function( errors, filePath ) {
        return errors;
    }
};

function determineMarketsToValidate() {
    // Verkrijg alle gewijzigde bestanden in de `config/markt/` folder, relatief aan de
    // project folder.
    const changedFiles = process.argv.slice(2)
                         .map(fullPath => path.relative(PROJECT_DIR, fullPath))
                         .filter(relPath => relPath.startsWith('config/markt/'));
    // Lijst van alle markten waar een config voor gedefinieerd is.
    const allMarketSlugs = fs.readdirSync(`${PROJECT_DIR}/config/markt`, { withFileTypes: true })
    .reduce((result, dirEnt) => {
        return dirEnt.isDirectory() ?
               result.concat(dirEnt.name) :
               result;
    }, []);
    // Lijst van alle markten waarvan een config bestand gewijzigd is.
    const changedMarketSlugs = changedFiles.reduce((result, relPath) => {
        const marketSlug = path.basename(path.dirname(relPath));
        return marketSlug !== 'markt' && !result.includes(marketSlug) ?
               result.concat(marketSlug) :
               result;
    }, []);

    // Als één van de 'root' bestanden is gewijzigd moeten alle markten gecontroleerd worden.
    // Anders enkel degenen die gewijzigde config bestanden bevatten.
    const checkAllMarkets = intersects(changedFiles, ROOTFILES);

    return checkAllMarkets ?
           allMarketSlugs :
           changedMarketSlugs;
}

function indexAllBranches( filePath ) {
    const branches = readJSON(filePath);
    return branches.map(branche => branche.brancheId);
}

run();
