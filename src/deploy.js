const models = require('./model/index.ts');

// Force staat hier niet op true daarom worden de wijzingen niet doorgevoerd
// models.sequelize.sync({ force: true})
// models.sequelize.sync({ alter: true})


// Ensure the database tables have been created, particularly the session storage.
models.sequelize.sync().then(
    () => console.log('Database tables successfully initialized'),
    err => {
        console.log(err);
        process.exit(1);
    },
);
