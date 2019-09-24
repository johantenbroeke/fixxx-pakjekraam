import { voorkeur } from '../model/index';
import { Voorkeur } from '../model/voorkeur.model';

export const getVoorkeur = (
    erkenningsNummer: string,
    marktId: string,
): Promise<Voorkeur> => {
    return voorkeur
        .findOne<Voorkeur>({
            where: { erkenningsNummer, marktId },
            raw: true,
        })
        .then(result => {
            return result
        });
};


export const getVoorkeuren = (
    erkenningsNummer: string,
    marktId: string,
): Promise<Voorkeur[]> => {
    return voorkeur
        .findAll<Voorkeur>({
            where: { erkenningsNummer, marktId },
            raw: true,
        })
        .then(result => {
            return result
        });
};
