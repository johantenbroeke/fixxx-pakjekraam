module.exports = (sequelize, DataTypes) => {
    const markt = sequelize.define(
        'markt',
        {
            marktId: {
                type: DataTypes.INTEGER,
                unique: 'key',
                primaryKey: true,
            },
            title: {
                type: DataTypes.STRING,
            },
            monday: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
            },
            tuesday: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
            },
            wednesday: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
            },
            thursday: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
            },
            friday: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
            },
            saturday: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
            },
            sunday: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
            },
        },
        {
            freezeTableName: true,
            tableName: 'markt',
        },
    );

    return markt;
};
