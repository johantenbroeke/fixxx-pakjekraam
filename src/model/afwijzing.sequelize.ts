import { Sequelize, DataTypes } from 'sequelize';
import { Afwijzing } from './afwijzing.model';

export const initAfwijzing = (sequelize: Sequelize) => {
    const attributes = {
        marktId: {
            type: DataTypes.INTEGER,
            unique: 'key',
        },
        marktDate: {
            type: DataTypes.DATEONLY,
            unique: 'key',
        },
        reasonCode: {
            type: DataTypes.INTEGER,
            unique: 'key',
        },
        erkenningsNummer: {
            type: DataTypes.STRING,
        },
        plaatsvoorkeuren: {
            type: DataTypes.ARRAY(DataTypes.STRING),
        },
        anywhere: {
            type: DataTypes.BOOLEAN,
        },
        minimum: {
            type: DataTypes.INTEGER,
        },
        maximum: {
            type: DataTypes.INTEGER,
        },
        bak: {
            type: DataTypes.BOOLEAN,
        },
        brancheId: {
            type: DataTypes.INTEGER,
        },
    };

    Afwijzing.init(attributes, {
        modelName: 'afwijzing',
        freezeTableName: true,
        sequelize,
        tableName: 'afwijzing',
    });

    return Afwijzing;
};

export default initAfwijzing;
