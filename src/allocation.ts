const models = require('./model/index.ts');
import { getIndelingslijst, getDaysClosed } from './pakjekraam-api';

import { flatten, tomorrow, getMaDiWoDo, toISODate } from './util';
import { convertToewijzingForDB } from './model/allocation.functions';
import { convertAfwijzingForDB } from './model/afwijzing.functions';
// import { MMMarkt } from './makkelijkemarkt.model';
// import { IMarkt, IMarktEnriched } from './markt.model';
import { getMarktenEnabled, getMarktEnriched } from './model/markt.functions';

import { sequelize } from './model/index';

const marktDate = tomorrow();

const mapMarktenToToewijzingen = (markten: any) => {
    return markten
    .map((markt: any) =>
        markt.toewijzingen.map( (toewijzing: any) => convertToewijzingForDB(toewijzing, markt, marktDate)),
    )
    .reduce(flatten, [])
    .map( ( toewijzing: any) =>
        toewijzing.plaatsen.map((plaatsId: string) => ({
            marktId: toewijzing.marktId,
            marktDate: toewijzing.marktDate,
            plaatsId,
            erkenningsNummer: toewijzing.erkenningsNummer,
        })),
    )
    .reduce(flatten, []);
};


const mapMarktenToAfwijzingen = (markten: any) => {
    return markten
        .map((markt: any) =>
            markt.afwijzingen.map( (afwijzing: any) => convertAfwijzingForDB(afwijzing, markt, marktDate)),
        )
        .reduce(flatten, []);
};

async function destroyAndCreateToewijzingenAfwijzingen(result: any) {

    try {
        const transaction = await sequelize.transaction();
        await models.allocation.destroy({ where: { marktDate }, transaction });
        await models.afwijzing.destroy({ where: { marktDate }, transaction });
        await models.allocation.bulkCreate(result[0], { validate: true }, transaction);
        await models.afwijzing.bulkCreate(result[1], { validate: true }, transaction);
        await transaction.commit();
        process.exit();
    } catch(e) {
        console.log(e);
        process.exit();
    }
}

async function allocation() {

    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowString = toISODate(tomorrow);
        const daysClosed = await getDaysClosed();
        console.log(daysClosed);
        console.log(tomorrowString);
        daysClosed.includes(tomorrowString) ? console.log(`Indeling wordt niet gedraaid, ${tomorrowString} gevonden in daysClosed.json`) : runAllocation();
    } catch(e) {
        console.log(e);
        process.exit();
    }

}

async function runAllocation() {

    try {

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const markten = await getMarktenEnabled();
        let marktenEnriched = await Promise.all(markten.map(markt => getMarktEnriched(String(markt.id))));

        marktenEnriched = marktenEnriched.filter( markt => markt.fase === 'live' || markt.fase === 'wenperiode');
        // If maDiWoDo of tomorrow in included in marktDagen, the allocation wil run

        const maDiWoDo = getMaDiWoDo(tomorrow);
        marktenEnriched = marktenEnriched.filter( markt => markt.marktDagen.includes(maDiWoDo));

        const indelingen = await Promise.all(markten.map(markt => getIndelingslijst(String(markt.id), marktDate)));

        const toewijzingen = await mapMarktenToToewijzingen(indelingen);
        const afwijzingen = await mapMarktenToAfwijzingen(indelingen);

        await destroyAndCreateToewijzingenAfwijzingen([toewijzingen, afwijzingen]);

    }   catch(e) {
        console.log(e);
        process.exit();
    }

}

allocation();
