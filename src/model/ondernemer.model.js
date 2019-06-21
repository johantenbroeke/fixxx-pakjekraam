module.exports = (sequelize, DataTypes) => {
    const ondernemer = sequelize.define(
        'ondernemer',
        {
            erkenningsNummer: {
                type: DataTypes.STRING,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING,
            },
            account: {
                type: DataTypes.STRING,
            },
            inactive: {
                type: DataTypes.BOOLEAN,
            },
        },
        {
            freezeTableName: true,
            tableName: 'ondernemer',
        },
    );

    return ondernemer;
};
