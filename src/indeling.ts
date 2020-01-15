import {
    IMarkt,
    IMarktindeling,
    IMarktindelingSeed
} from './markt.model';

import Indeling from './allocation/indeling';
import Ondernemer from './allocation/ondernemer';

/*
 * https://decentrale.regelgeving.overheid.nl/cvdr/XHTMLoutput/Actueel/Amsterdam/396119.html#id1-3-2-2-3-4-5
 */

export const calcToewijzingen = (markt: IMarkt & IMarktindelingSeed): IMarktindeling => {
    let indeling = Indeling.init(markt);

    // Als er een A-lijst is, deel deze ondernemers eerst volledig in...
    if (indeling.aLijst.length) {
        const aListQueue = indeling.ondernemers.filter(ondernemer =>
            Indeling.getListGroup(indeling, ondernemer) === 1
        );
        indeling = Indeling.performCalculation(indeling, aListQueue);
    }

    // ... en probeer daarna de andere ondernemers nog een plaats te geven.
    // Indien er geen A-lijst is voor deze dag deelt dit stuk alle ondernemers in.
    const bListQueue = indeling.ondernemers.filter(ondernemer =>
        !indeling.aLijst.length ||
        Indeling.getListGroup(indeling, ondernemer) === 2
    );
    indeling = Indeling.performCalculation(indeling, bListQueue);

    return indeling;
};
