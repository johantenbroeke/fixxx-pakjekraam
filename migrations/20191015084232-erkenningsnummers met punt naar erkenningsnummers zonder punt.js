module.exports = {

  async up(queryInterface, Sequelize) {

    const transaction = await queryInterface.sequelize.transaction();

    function deleteIfInOndernemersTeVerwijderen(tabel){
      console.log(`querying ${tabel}`);
      return queryInterface.sequelize.query(`SELECT * FROM ${tabel} WHERE "erkenningsNummer" IN (
        '19910204.02',
        '20011114.01',
        '20150327.01',
        '20160603.01',
        '20190123.02',
        '20190425.02',
        '2015010604',
        '2017040502',
        '2012011203',
        '2014030404',
        '2009041503',
        '2009011202')`, {
        type: queryInterface.sequelize.QueryTypes.SELECT
      }, transaction)
      .then(records => {
        // let voorkeurenPromises = [];
        return records.map( record => {
          return queryInterface.bulkDelete(tabel, {
            id: record.id
          }, { transaction });
        });
      })
      .catch(e => {
        console.log(e);
      });
    }

    function stripErkenningsNummerFromDots(tabel){
      console.log(`querying ${tabel}`);
      return queryInterface.sequelize.query(`SELECT * FROM ${tabel} WHERE "erkenningsNummer" LIKE '%.%'`, {
        type: queryInterface.sequelize.QueryTypes.SELECT
      }, transaction)
      .then(voorkeuren => {
        // let voorkeurenPromises = [];
        return voorkeuren.map( voorkeur => {
          return queryInterface.bulkUpdate(tabel, {
            erkenningsNummer: voorkeur.erkenningsNummer.replace(".", "")
          }, {
            id: voorkeur.id
          }, { transaction });
        });
      })
      .catch(e => {
        console.log(e);
      });
    }

    try {

      // VOORKEUREN
      let changesDeletedVoorkeuren = await deleteIfInOndernemersTeVerwijderen('voorkeur')
      console.log(`Voorkeuren deleted: ${changesDeletedVoorkeuren.length}`);
      let changes = await stripErkenningsNummerFromDots('voorkeur')
      console.log(`Changes done: ${changes.length}`);

      // ALLOCATIONS
      let deletedAllocations = await deleteIfInOndernemersTeVerwijderen('allocation')
      console.log(`Allocations deleted: ${deletedAllocations.length}`);
      let changesAllocation = await stripErkenningsNummerFromDots('allocation')
      console.log(`Changes done: ${changesAllocation.length}`);

      // PLAATSVOORKEUREN
      let deletedPlaatsvoorkeuren = await deleteIfInOndernemersTeVerwijderen('plaatsvoorkeur')
      console.log(`Plaatsvoorkeuren deleted: ${deletedPlaatsvoorkeuren.length}`);
      let changesPlaatsvoorkeur = await stripErkenningsNummerFromDots('plaatsvoorkeur')
      console.log(`Changes done: ${changesPlaatsvoorkeur.length}`);

      // RSVPS
      let deletedRSVPS = await deleteIfInOndernemersTeVerwijderen('rsvp')
      console.log(`RSVPS deleted: ${deletedRSVPS.length}`);
      let changesRSVP = await stripErkenningsNummerFromDots('rsvp')
      console.log(`Changes done: ${changesRSVP.length}`);

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  },

  async down(queryInterface, Sequelize) {

  },

};

