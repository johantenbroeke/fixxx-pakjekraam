import { DataTypes, Sequelize, Model } from 'sequelize';

export class Log extends Model {
    public ts!: number;
    public level!: string;
    public msg!: string;
    public meta: any;
}

export const initLog = (sequelize: Sequelize) => {
    Log.init({
        ts: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            allowNull: false
        },
        level: {
            type: DataTypes.STRING(255),
            defaultValue: 'debug',
            allowNull: false
        },
        msg: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        meta: {
            type: DataTypes.JSON,
            allowNull: true
        }
    }, {
        freezeTableName: true,
        modelName: 'log',
        sequelize,
        tableName: 'log',
        timestamps: false
    });

    // Geen primary key nodig, maar sequelize voegt hem automatisch toe.
    Log.removeAttribute('id');

    return Log;
};
