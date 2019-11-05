const models = require('./model/index.ts');
import { getIndelingslijst } from './pakjekraam-api';

import { flatten, tomorrow, getMaDiWoDo } from './util';
import { convertToewijzingForDB } from './model/allocation.functions';
import { convertAfwijzingForDB } from './model/afwijzing.functions';
import { MMMarkt } from './makkelijkemarkt.model';
import { IMarkt, IMarktEnriched } from './markt.model';
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
    const transaction = await sequelize.transaction();
    await models.allocation.destroy({ where: { marktDate }, transaction });
    await models.afwijzing.destroy({ where: { marktDate }, transaction });
    await models.allocation.bulkCreate(result[0], { validate: true }, transaction);
    await models.afwijzing.bulkCreate(result[1], { validate: true }, transaction);
    await transaction.commit();
    process.exit();
}

getMarktenEnabled()
    .then((markten: MMMarkt[]) => {
        return Promise.all(markten.map(markt => getMarktEnriched(String(markt.id))));
    })
    .then((markten: IMarktEnriched[]) => {
        markten = markten.filter( markt => markt.fase === 'live' || markt.fase === 'wenperiode');
        // If maDiWoDo of tomorrow in included in marktDagen, the allocation wil run
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const maDiWoDo = getMaDiWoDo(tomorrow);
        markten = markten.filter( markt => markt.marktDagen.includes(maDiWoDo));
        return Promise.all(markten.map(markt => getIndelingslijst(String(markt.id), marktDate)));
    })
    .then( (marktenEnriched: IMarkt[] ) => {
        return Promise.all( [ mapMarktenToToewijzingen(marktenEnriched), mapMarktenToAfwijzingen(marktenEnriched) ] );
    })
    .then( (result: any) => {
        return destroyAndCreateToewijzingenAfwijzingen(result);
    })
    .then( (result: any) => {
        process.exit();
    })
    .catch( (e: any) => {
        console.log(e);
    });
