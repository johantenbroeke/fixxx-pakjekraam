module.exports = {

  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // await queryInterface.removeColumn('voorkeur','monday', { transaction });
      // await queryInterface.removeColumn('voorkeur','tuesday', { transaction });
      // await queryInterface.removeColumn('voorkeur','wednesday', { transaction });
      // await queryInterface.removeColumn('voorkeur','thursday', { transaction });
      // await queryInterface.removeColumn('voorkeur','friday', { transaction });
      // await queryInterface.removeColumn('voorkeur','saturday', { transaction });
      // await queryInterface.removeColumn('voorkeur','sunday', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn( 'voorkeur', 'monday', 
        { type: Sequelize.BOOLEAN, },
        { transaction }
      );
      await queryInterface.addColumn( 'voorkeur', 'tuesday', 
        { type: Sequelize.BOOLEAN, },
        { transaction }
      );
      await queryInterface.addColumn( 'voorkeur', 'wednesday', 
        { type: Sequelize.BOOLEAN, },
        { transaction }
      );
      await queryInterface.addColumn( 'voorkeur', 'thursday', 
        { type: Sequelize.BOOLEAN, },
        { transaction }
      );
      await queryInterface.addColumn( 'voorkeur', 'friday', 
        { type: Sequelize.BOOLEAN, },
        { transaction }
      );
      await queryInterface.addColumn( 'voorkeur', 'saturday', 
        { type: Sequelize.BOOLEAN, },
        { transaction }
      );
      await queryInterface.addColumn( 'voorkeur', 'sunday', 
        { type: Sequelize.BOOLEAN, },
        { transaction }
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

};