import { Sequelize, DataTypes, Model } from 'sequelize';
import { IMarktondernemerVoorkeurRow } from '../markt.model';

export class Voorkeur
extends Model<IMarktondernemerVoorkeurRow, IMarktondernemerVoorkeurRow>
implements IMarktondernemerVoorkeurRow {
    public erkenningsNummer!: string;
    public marktId: string;
    public marktDate: string | null;
    public anywhere: boolean | null;
    public minimum?: number | null;
    public maximum?: number | null;
    public brancheId: string | null;
    public parentBrancheId: string | null;
    public inrichting: string | null;
    public absentFrom: Date | null;
    public absentUntil: Date | null;
}

export const initVoorkeur = (sequelize: Sequelize) => {
    return Voorkeur.init({
        erkenningsNummer: {
            type: DataTypes.STRING,
            allowNull: false,
            // unique: 'key',
        },
        marktId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            unique: 'key',
        },
        marktDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            unique: 'key',
        },
        anywhere: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        minimum: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        maximum: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        brancheId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        parentBrancheId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        inrichting: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        absentFrom: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        absentUntil: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
    }, {
        modelName: 'voorkeur',
        freezeTableName: true,
        sequelize,
        tableName: 'voorkeur',
    });
};
