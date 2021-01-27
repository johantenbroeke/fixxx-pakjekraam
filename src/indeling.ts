import {
    IMarkt,
    IMarktindeling,
    IMarktondernemer,
    IMarktindelingSeed
} from './markt.model';

import Indeling from './allocation/indeling';
import Ondernemer from './allocation/ondernemer';

const getListGroup = (
    indeling: IMarktindeling,
    ondernemer: IMarktondernemer
) =>
     Ondernemer.isVast(ondernemer)        ? 1 :
     indeling.aLijst.includes(ondernemer) ? 1 :
                                            2;

//  https://decentrale.regelgeving.overheid.nl/cvdr/XHTMLoutput/Actueel/Amsterdam/396119.html#id1-3-2-2-3-4-5
export const calcToewijzingen = (markt: IMarkt & IMarktindelingSeed): IMarktindeling => {
    let indeling = Indeling.init(markt);

    // Als er een A-lijst is, deel deze ondernemers eerst volledig in...
    if (indeling.aLijst.length) {
        const aListQueue = indeling.ondernemers.filter(ondernemer =>
            getListGroup(indeling, ondernemer) === 1
        );
        indeling = calc(indeling, aListQueue);
    }

    // ... en probeer daarna de andere ondernemers nog een plaats te geven.
    // Indien er geen A-lijst is voor deze dag deelt dit stuk alle ondernemers in.
    const bListQueue = indeling.ondernemers.filter(ondernemer =>
        !indeling.aLijst.length ||
        getListGroup(indeling, ondernemer) === 2
    );
    indeling = calc(indeling, bListQueue);

    return indeling;
};

const calc = (indeling: IMarktindeling, queue: IMarktondernemer[]): IMarktindeling => {
    indeling = Indeling.performCalculation(indeling, queue);
    // Soms komen er plaatsen vrij omdat iemands `minimum` niet verzadigd is. Probeer
    // eerder afgewezen sollicitanten opnieuw in te delen omdat deze mogelijk passen op
    // de vrijgekomen plaatsen.
    const rejectedQueue = indeling.afwijzingen.map(({ ondernemer }) => ondernemer);
    indeling = Indeling.performCalculation(indeling, rejectedQueue);

    return indeling;
};
