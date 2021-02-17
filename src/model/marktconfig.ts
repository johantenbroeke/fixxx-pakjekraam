import * as fs from 'fs';
import * as path from 'path';

import {
    DataTypes,
    Model,
    Sequelize,
} from 'sequelize';

const CONFIG_DIR = path.resolve(__dirname, '../../config/markt');
const CONFIG_PROPERTIES = [
    'locaties',
    'markt',
    'branches',
    'geografie',
    'paginas'
];
const INDEX = {
    branches            : indexAllBranches(readJSON(`${CONFIG_DIR}/branches.json`)),
    obstakelTypes       : readJSON(`${CONFIG_DIR}/obstakeltypes.json`),
    plaatsEigenschappen : readJSON(`${CONFIG_DIR}/plaatseigenschappen.json`)
};
const SCHEMAS = require('../markt-config.model.js')(INDEX);

// Dit kan pas na het initialiseren van SCHEMAS gebeuren, omdat SCHEMAS dit
// bestand gebruikt.
validateAllBranches(readJSON(`${CONFIG_DIR}/branches.json`));


export class MarktConfig extends Model {
    public id!: number;
    public marktAfkorting!: number;
    public createdBy: number;
    public createdAt!: Date;
    public title!: string;
    public data!: object;

    public static findMostRecent(marktAfkorting) {
        return this.findOne({
            where: { marktAfkorting },
            order: [['createdAt', 'DESC']]
        });
    }

    public static store(marktAfkorting, data) {
        return this.findMostRecent(marktAfkorting)
        .then(configModel => {
            if (!configModel) {
                return null;
            }

            const currentData = JSON.stringify(configModel.data);
            const newData     = JSON.stringify(data);
            return currentData === newData ?
                   configModel :
                   null;
        })
        .then(configModel => {
            if (configModel) {
                return configModel;
            }

            return this.create({
                marktAfkorting,
                createdAt: new Date(),
                data
            });
        });
    }
}

export const initMarktConfig = (sequelize: Sequelize) => {
    MarktConfig.init({
        id: {
            primaryKey: true,
            type: DataTypes.INTEGER,
            autoIncrement: true
        },
        marktAfkorting: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            allowNull: false
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        type: {
            type: DataTypes.STRING(32),
            allowNull: false,
            defaultValue: 'all'
        },
        data: {
            type: DataTypes.JSON,
            allowNull: false,
            validate: {
                isValidMarktConfig
            }
        }
    }, {
        sequelize,
        freezeTableName: true,
        modelName: 'marktconfig',
        tableName: 'marktconfig',
        timestamps: false,

        indexes: [{
            name: 'marktAfkorting',
            fields: ['marktAfkorting', 'createdAt']
        }],
    });

    return MarktConfig;
};

const isValidMarktConfig = (configData) => {
    const index = {
        locaties: indexMarktPlaatsen(configData.locaties),
        markt: indexMarktRows(configData.markt)
    };

    let errors = {};
    for (const property of CONFIG_PROPERTIES) {
        errors = VALIDATORS[property](errors, configData, property, index);
    }

    if (!Object.keys(errors).length) {
        return;
    }

    const validationError = Object.keys(errors).reduce((result, property) => {
        const propErrors = errors[property];
        const errorString = propErrors.reduce((errors, error) => `${errors}  ${error}\n`, '');
        return `${result}${property}\n${errorString}\n`;
    }, '');

    throw Error(validationError);
};

const VALIDATORS = {
    branches( errors, configData, property, index ) {
        const validate = ( fileErrors, marketBranches ) => {
            marketBranches.reduce((unique, { brancheId }, i) => {
                if (unique.includes(brancheId)) {
                    fileErrors.push([`DATA[${i}] Duplicate branche '${brancheId}'`]);
                } else {
                    unique.push(brancheId);
                }

                return unique;
            }, []);
            return fileErrors;
        };

        return validateData(errors, configData, property, SCHEMAS.MarketBranches, validate, false);
    },
    geografie( errors, configData, property, index ) {
        const validate = ( fileErrors, { obstakels } ) => {
            obstakels.reduce((unique, obstakel, i) => {
                const current = [obstakel.kraamA, obstakel.kraamB].sort();
                // Is obstakeldefinitie uniek?
                if (!unique.find(entry => entry.join() === current.join())) {
                    // Bestaan beide kramen in `locaties`?
                    if (obstakel.kraamA && !index.locaties.includes(obstakel.kraamA)) {
                        fileErrors.push(`DATA.obstakels[${i}].kraamA does not exist: ${obstakel.kraamA}`);
                    }
                    if (obstakel.kraamB && !index.locaties.includes(obstakel.kraamB)) {
                        fileErrors.push(`DATA.obstakels[${i}].kraamB does not exist: ${obstakel.kraamB}`);
                    }

                    // Staan beide kramen in verschillende rijen in `markt`?
                    if (
                        current[0] in index.markt && current[1] in index.markt &&
                        index.markt[current[0]] === index.markt[current[1]]
                    ) {
                        fileErrors.push(`DATA.obstakels[${i}] kraamA and kraamB cannot be in the same row (kraamA: ${obstakel.kraamA}, kraamB: ${obstakel.kraamB})`);
                    }

                    unique.push(current);
                } else {
                    fileErrors.push(`DATA.obstakels[${i}] is not unique (kraamA: ${obstakel.kraamA}, kraamB: ${obstakel.kraamB})`);
                }

                return unique;
            }, []);

            return fileErrors;
        };

        return validateData(errors, configData, property, SCHEMAS.MarketGeografie, validate, false);
    },
    locaties( errors, configData, property, index ) {
        const validate = ( fileErrors, locaties ) => {
            locaties.reduce((unique, { plaatsId }, i) => {
                if (unique.includes(plaatsId)) {
                    fileErrors.push(`DATA[${i}].plaatsId is not unique: ${plaatsId}`);
                } else {
                    if (!(plaatsId in index.markt)) {
                        fileErrors.push(`DATA[${i}].plaatsId does not exist in markt: ${plaatsId}`);
                    }

                    unique.push(plaatsId);
                }

                return unique;
            }, []);

            return fileErrors;
        };

        return validateData(errors, configData, property, SCHEMAS.MarketLocaties, validate, true);
    },
    markt( errors, configData, property, index ) {
        const validate = ( fileErrors, { rows } ) => {
            return rows.reduce((_fileErrors, row, i) => {
                row.forEach((plaatsId, j) => {
                    if (!index.locaties.includes(plaatsId)) {
                        _fileErrors.push(`DATA.rows[${i}][${j}].plaatsId does not exist in locaties: ${plaatsId}`);
                    }
                });

                return _fileErrors;
            }, fileErrors);
        };

        return validateData(errors, configData, property, SCHEMAS.Market, validate, true);
    },
    paginas( errors, configData, property, index ) {
        const validate = ( fileErrors, sections ) => {
            sections.forEach((section, i) => {
                section.indelingslijstGroup.forEach((group, j) => {
                    if ('plaatsList' in group) {
                        fileErrors = group.plaatsList.reduce((_fileErrors, plaatsId, k) => {
                            return !index.locaties.includes(plaatsId) ?
                                   _fileErrors.concat(`DATA[${i}].indelingslijstGroup[${j}].plaatsList[${k}] does not exist in locaties: ${plaatsId}`) :
                                   _fileErrors;
                        }, fileErrors);
                    }
                });
            });

            return fileErrors;
        };

        return validateData(errors, configData, property, SCHEMAS.Paginas, validate, true);
    }
};

function indexAllBranches(branches) {
    return branches.map(branche => branche.brancheId);
}
function indexMarktPlaatsen(plaatsen=[]) {
    return plaatsen.map(plaats => plaats.plaatsId);
}
function indexMarktRows(markt) {
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
function validateAllBranches(branches) {
    const errors = SCHEMAS.AllBranches(branches).errors;
    if (errors.length) {
        throw errors;
    }
}

function validateData(
    errors,
    configData,
    property,
    schema,
    extraValidation,
    required = true
) {
    let propErrors;

    if (required && !(property in configData)) {
        propErrors = ['Property is missing'];
    } else {
        propErrors = schema(configData[property]).errors.map(error => {
            switch (error.name) {
                case 'enum':
                    return `${error.property} has unknown value '${error.instance}'`;
                default:
                    return error.stack;
            }
        });
        if (!propErrors.length && typeof extraValidation === 'function') {
            propErrors = extraValidation(propErrors, configData[property]);
        }
    }

    return propErrors.length ?
           { ...errors, [property]: propErrors } :
           errors;
}

function readJSON(filePath, emitError=true) {
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
