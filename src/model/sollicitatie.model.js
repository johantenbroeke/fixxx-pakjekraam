module.exports = (sequelize, DataTypes) => {
    const allocation = sequelize.define(
        'sollicitatie',
        {
            marktId: {
                type: DataTypes.INTEGER,
                unique: 'key',
            },
            erkenningsNummer: {
                type: DataTypes.STRING,
                unique: 'key',
            },
            sollicitatieNummer: {
                type: DataTypes.INTEGER,
            },
            status: {
                type: DataTypes.STRING,
            },
            plaatsIds: {
                type: DataTypes.ARRAY(DataTypes.TEXT),
            },
            inactive: {
                type: DataTypes.BOOLEAN,
            },
        },
        {
            freezeTableName: true,
            tableName: 'sollicitatie',
        },
    );

    return allocation;
};
