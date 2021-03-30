const models = require('./model/index.ts');
import { calculateIndelingslijst, getDaysClosed } from './pakjekraam-api';

import { flatten, getTimezoneTime } from './util';
import { INDELING_DAG_OFFSET } from './domain-knowledge.js';
import { convertToewijzingForDB, getToewijzingEnriched } from './model/allocation.functions';
import { convertAfwijzingForDB, getAfwijzingEnriched } from './model/afwijzing.functions';
import { getMarktenByDate } from './model/markt.functions';

import { sequelize } from './model/index';
import { IToewijzing, IAfwijzing } from 'markt.model';
import { MMMarkt } from 'makkelijkemarkt.model';

const timezoneTime = getTimezoneTime();
timezoneTime.add(INDELING_DAG_OFFSET, 'days');
const marktDate = timezoneTime.format('YYYY-MM-DD');

const mapMarktenToToewijzingen = (markten: any): Promise<IToewijzing[]> => {
    return markten
    .map((markt: any) =>
        markt.toewijzingen.map( (toewijzing: any) => convertToewijzingForDB(toewijzing, markt, marktDate)),
    )
    .reduce(flatten, [])
    .map(( toewijzing: any) =>
        toewijzing.plaatsen.map((plaatsId: string) => ({
            marktId: toewijzing.marktId,
            marktDate: toewijzing.marktDate,
            plaatsId,
            erkenningsNummer: toewijzing.erkenningsNummer,
        })),
    )
    .reduce(flatten, []);
};

const mapMarktenToAfwijzingen = (markten: any): Promise<IAfwijzing[]> => {
    return markten
    .map((markt: any) =>
        markt.afwijzingen.map((afwijzing: any) =>
            convertAfwijzingForDB(afwijzing, markt, marktDate)
        )
    )
    .reduce(flatten, []);
};

async function destroyAndCreateToewijzingenAfwijzingen(toewijzingen: IToewijzing[], afwijzingen: IAfwijzing[]) {
    const transaction = await sequelize.transaction();
    await models.allocation.destroy({ where: { marktDate }, transaction });
    await models.afwijzing.destroy({ where: { marktDate }, transaction });
    await models.allocation.bulkCreate(toewijzingen, { validate: true }, transaction);
    await models.afwijzing.bulkCreate(afwijzingen, { validate: true }, transaction);
    await transaction.commit();
}

async function allocate() {
    try {
        const daysClosed = await getDaysClosed();

        if (daysClosed.includes(marktDate)) {
            console.log(`Indeling wordt niet gedraaid, ${marktDate} gevonden in daysClosed.json`);
            process.exit(0);
        }

        let markten = await getMarktenByDate(marktDate);
        markten = markten.filter((markt: MMMarkt) =>
            markt.kiesJeKraamFase === 'live' || markt.kiesJeKraamFase === 'wenperiode'
        );

        if (!markten.length) {
            console.log('Geen indelingen gedraaid.');
            process.exit(0);
        }

        const indelingen = await Promise.all(markten.map((markt: MMMarkt) =>
            calculateIndelingslijst(String(markt.id), marktDate, true))
        );

        const toewijzingen = await mapMarktenToToewijzingen(indelingen);
        const afwijzingen = await mapMarktenToAfwijzingen(indelingen);

        const toewijzingenEnriched = await Promise.all(
            toewijzingen.map(toewijzing => getToewijzingEnriched(toewijzing)
        ));

        const afwijzingenEnriched = await Promise.all(
            afwijzingen.map(afwijzing => getAfwijzingEnriched(afwijzing)
        ));

        await destroyAndCreateToewijzingenAfwijzingen(toewijzingenEnriched, afwijzingenEnriched);

        process.exit(0);
    } catch(e) {
        console.log(e);
        process.exit(1);
    }
}

allocate();
