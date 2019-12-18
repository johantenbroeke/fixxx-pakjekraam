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

function readJSON( filePath, emitError=true ) {
    try {
        const data = fs.readFileSync(filePath, { encoding: 'utf8' });
        return JSON.parse(String(data));
    } catch (e) {
        if (emitError) {
            throw e;
        } else {
            return undefined;
        }
    }
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
    let fileErrors;
    try {
        const data = readJSON(filePath);

        fileErrors = schema(data).errors.map(error => error.stack);
        if (typeof extraValidation === 'function') {
            fileErrors = extraValidation(fileErrors, data);
        }
    } catch (e) {
        fileErrors = required ? ['File not found'] : [];
    }

    if (!fileErrors.length) {
        return errors;
    }

    return {
        ...errors,
        [filePath]: fileErrors
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
    const index = {
        locaties: indexMarktPlaatsen(`${marketPath}/locaties.json`),
        markt: indexMarktRows(`${marketPath}/markt.json`)
    };

    for (const fileName of MARKETFILES) {
        errors = VALIDATORS[fileName](errors, `${marketPath}/${fileName}`, index);
    }
    return errors;
}
const VALIDATORS = {
    'branches.json': function( errors, filePath, index ) {
        function validate( fileErrors, marketBranches ) {
            return marketBranches.reduce((_fileErrors, { id }, i) => {
                return !INDEX.branches.includes(id) ?
                       _fileErrors.concat([`DATA[${i}].id branche '${id}' does not exist`]) :
                       _fileErrors;
            }, fileErrors);
        }

        return validateFile(errors, filePath, SCHEMAS.MarketBranches, validate, false);
    },
    'geografie.json': function( errors, filePath ) {
        return errors;
    },
    'locaties.json': function( errors, filePath, index ) {
        return errors;
    },
    'markt.json': function( errors, filePath, index ) {
        return errors;
    },
    'paginas.json': function( errors, filePath, index ) {
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
    const checkAllMarkets = !changedFiles.length ||
                            intersects(changedFiles, ROOTFILES);

    return checkAllMarkets ?
           allMarketSlugs :
           changedMarketSlugs;
}

function indexAllBranches( filePath ) {
    const branches = readJSON(filePath);
    return branches.map(branche => branche.brancheId);
}
function indexMarktPlaatsen( filePath ) {
    const plaatsen = readJSON(filePath, false) || [];
    return plaatsen.map(plaats => plaats.plaatsId);
}
function indexMarktRows( filePath ) {
    const markt = readJSON(filePath, false);
    if (!markt) {
        return {};
    }

    const index = {};
    markt.rows.forEach((row, rowNum) => {
        for (const plaatsId of row) {
            index[plaatsId] = rowNum;
        }
    });
    return index;
}

run();
