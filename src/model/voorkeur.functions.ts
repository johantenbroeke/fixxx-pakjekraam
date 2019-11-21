import { voorkeur } from './index';
import {
    IMarktondernemerVoorkeur,
    // IMarktondernemerVoorkeurRow,
} from '../markt.model';
import { Voorkeur } from './voorkeur.model';
// import { numberSort } from '../util';


// const indelingVoorkeurSort = (a: IMarktondernemerVoorkeur, b: IMarktondernemerVoorkeur) =>
//         numberSort(indelingVoorkeurPrio(a), indelingVoorkeurPrio(b));

// const indelingVoorkeurPrio = (voorkeur: IMarktondernemerVoorkeur): number =>
//         (voorkeur.marktId ? 1 : 0) | (voorkeur.marktDate ? 2 : 0);

export const deleteVoorkeurenByErkenningsnummer = (erkenningsNummer: string) =>
    voorkeur
        .destroy({ where: { erkenningsNummer } });

export const getVoorkeurenByMarkt = (marktId: string): Promise<IMarktondernemerVoorkeur[]> =>
    voorkeur
        .findAll<Voorkeur>({
            where: { marktId }, raw: true
        })
        .then(voorkeuren => voorkeuren);
