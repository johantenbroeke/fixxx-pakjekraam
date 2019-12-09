import { voorkeur } from './index';
import {
    IMarktondernemerVoorkeur,
    IMarktondernemerVoorkeurRow,

} from '../markt.model';
import { Voorkeur } from './voorkeur.model';

import Sequelize from 'sequelize';

const Op = Sequelize.Op;

export const deleteVoorkeurenByErkenningsnummer = (erkenningsNummer: string) =>
    voorkeur
        .destroy({ where: { erkenningsNummer } });

export const getVoorkeurenByMarkt = (marktId: string): Promise<IMarktondernemerVoorkeur[]> =>
    voorkeur
        .findAll<Voorkeur>({
            where: { marktId }, raw: true
        })
        .then(voorkeuren => voorkeuren);

export const getVoorkeurByOndernemer = (erkenningsNummer: string): Promise<IMarktondernemerVoorkeur> =>
    voorkeur
        .findOne<Voorkeur>({
            where: { erkenningsNummer }, raw: true
        });

export const getVoorkeurByMarktEnOndernemer = (marktId: string, erkenningsNummer: string): Promise<IMarktondernemerVoorkeurRow> =>
voorkeur
    .findOne<Voorkeur>({
        where: { erkenningsNummer, marktId }, raw: true
    });

export const getVoorkeurenAbsentByMarkt = (marktId: string): Promise<IMarktondernemerVoorkeur[]> =>
    voorkeur
        .findAll<Voorkeur>({
            where: {
                marktId,
                absentFrom: {
                    [Op.ne]: null
                },
                absentUntil: {
                    [Op.ne]: null
                },
            }, raw: true
        });
