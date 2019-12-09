'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    const transaction = await queryInterface.sequelize.transaction();

    try {

      await queryInterface.addColumn('allocation', 'plaatsvoorkeuren',
        { type: Sequelize.ARRAY(Sequelize.TEXT), },
        { transaction }
      );
      await queryInterface.addColumn('allocation', 'anywhere',
        { type: Sequelize.BOOLEAN, },
        { transaction }
      );
      await queryInterface.addColumn('allocation', 'minimum',
        { type: Sequelize.INTEGER, },
        { transaction }
      );
      await queryInterface.addColumn('allocation', 'maximum',
        { type: Sequelize.INTEGER, },
        { transaction }
      );
      await queryInterface.addColumn('allocation', 'bak',
        { type: Sequelize.BOOLEAN, },
        { transaction }
      );
      await queryInterface.addColumn('allocation', 'brancheId',
        { type: Sequelize.STRING, },
        { transaction }
      );

      await queryInterface.addColumn('afwijzing', 'plaatsvoorkeuren',
        { type: Sequelize.ARRAY(Sequelize.TEXT), },
        { transaction }
      );
      await queryInterface.addColumn('afwijzing', 'anywhere',
        { type: Sequelize.BOOLEAN, },
        { transaction }
      );
      await queryInterface.addColumn('afwijzing', 'minimum',
        { type: Sequelize.INTEGER, },
        { transaction }
      );
      await queryInterface.addColumn('afwijzing', 'maximum',
        { type: Sequelize.INTEGER, },
        { transaction }
      );
      await queryInterface.addColumn('afwijzing', 'bak',
        { type: Sequelize.BOOLEAN, },
        { transaction }
      );
      await queryInterface.addColumn('afwijzing', 'brancheId',
        { type: Sequelize.STRING, },
        { transaction }
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  },

  async down (queryInterface, Sequelize) {

    const transaction = await queryInterface.sequelize.transaction();

    try {

      await queryInterface.removeColumn('allocation', 'plaatsvoorkeuren', { transaction })
      await queryInterface.removeColumn('allocation', 'anywhere', { transaction })
      await queryInterface.removeColumn('allocation', 'minimum', { transaction })
      await queryInterface.removeColumn('allocation', 'maximum', { transaction })
      await queryInterface.removeColumn('allocation', 'bak', { transaction })
      await queryInterface.removeColumn('allocation', 'brancheId', { transaction })

      await queryInterface.removeColumn('afwijzing', 'plaatsvoorkeuren', { transaction })
      await queryInterface.removeColumn('afwijzing', 'anywhere', { transaction })
      await queryInterface.removeColumn('afwijzing', 'minimum', { transaction })
      await queryInterface.removeColumn('afwijzing', 'maximum', { transaction })
      await queryInterface.removeColumn('afwijzing', 'bak', { transaction })
      await queryInterface.removeColumn('afwijzing', 'brancheId', { transaction })

      await transaction.commit();

    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  }
};
