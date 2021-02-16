const { DataTypes } = require('sequelize');

module.exports = {
    up: (queryInterface) => {
        return queryInterface.createTable('marktconfig', {
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
                allowNull: false
            }
        })
        .tap(() => {
            queryInterface.addIndex('marktconfig', {
                name: 'marktAfkorting',
                fields: ['marktAfkorting', 'createdAt']
            })
        });
    },
    down: (queryInterface) => {
        return queryInterface.dropTable('config');
    }
};
