import { plaatsvoorkeur } from './index';
import { IPlaatsvoorkeur } from 'markt.model';
import { Plaatsvoorkeur } from './plaatsvoorkeur.model';

export const deletePlaatsvoorkeurenByErkenningsnummer = (erkenningsNummer: string) =>
    plaatsvoorkeur.destroy({ where: { erkenningsNummer } });

export const getPlaatsvoorkeurenByMarktEnOndernemer = (marktId: string, erkenningsNummer: string): Promise<IPlaatsvoorkeur[]> =>
    plaatsvoorkeur
        .findAll<Plaatsvoorkeur>({
            where: { erkenningsNummer, marktId }, raw: true
        });
