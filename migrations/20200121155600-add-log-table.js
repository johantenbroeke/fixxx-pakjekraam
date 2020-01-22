const { DataTypes } = require('sequelize');

module.exports = {
  up: (queryInterface) => {
    return queryInterface.createTable('log', {
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
    });
  },
  down: (queryInterface) => {
    return queryInterface.dropTable('log');
  }
};