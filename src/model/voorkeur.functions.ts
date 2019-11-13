import { voorkeur as Voorkeur } from './index';

export const deleteVoorkeurenByErkenningsnummer = (erkenningsNummer: string) =>
    Voorkeur.destroy({ where: { erkenningsNummer } });

export const getVoorkeurenByMarkt = (marktId: string) =>
    Voorkeur.findAll({ where: { marktId }, raw: true });
