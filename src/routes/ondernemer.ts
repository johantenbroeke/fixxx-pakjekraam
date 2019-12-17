import { Request, Response } from 'express';
import { deletePlaatsvoorkeurenByErkenningsnummer } from '../model/plaatsvoorkeur.functions';
import { getToewijzingenByOndernemer } from '../model/allocation.functions';
import { deleteRsvpsByErkenningsnummer } from '../model/rsvp.functions';
import { deleteVoorkeurenByErkenningsnummer } from '../model/voorkeur.functions';
import { getMarktenEnabled } from '../model/markt.functions';
import { getMarktondernemer } from '../makkelijkemarkt-api';
import { getQueryErrors, internalServerErrorPage } from '../express-util';
import { MMSollicitatie } from '../makkelijkemarkt.model';
import { getAfwijzingenByOndernemer } from '../model/afwijzing.functions';
import { getAllBranches } from '../pakjekraam-api';

import { KeycloakRoles } from '../permissions';

export const deleteUserPage = ( req: Request, res: Response, result: string, error: string, csrfToken: string ) => {
    return res.render('DeleteUserPage', { result, error, csrfToken, role: KeycloakRoles.MARKTMEESTER });
};

export const deleteUser = (req: Request, res: Response, erkenningsNummer: string) => {
    Promise.all([
        // deleteAllocationsByErkenningsnummer(erkenningsNummer),
        deletePlaatsvoorkeurenByErkenningsnummer(erkenningsNummer),
        deleteRsvpsByErkenningsnummer(erkenningsNummer),
        deleteVoorkeurenByErkenningsnummer(erkenningsNummer)
    ])
    .then( (result) => {
        const numberOfRecordsFound = result.reduce((a,b) => a + b, 0);
        deleteUserPage(req, res, `${numberOfRecordsFound} records mbt registratienummer '${req.body.erkenningsNummer}' verwijderd`, null, req.csrfToken());
    })
    .catch( ( e: string ) => {
        internalServerErrorPage(res);
    });
};

export const publicProfilePage = async (req: Request, res: Response, erkenningsNummer: string, role: string) => {

    const messages = getQueryErrors(req.query);

    try {
        const ondernemer = await getMarktondernemer(erkenningsNummer);
        const marktenEnabled = await getMarktenEnabled();

        const marktenEnabledIds = marktenEnabled.map( (markt: any) => markt.id);
        ondernemer.sollicitaties = ondernemer.sollicitaties.filter((sollicitatie: MMSollicitatie) => marktenEnabledIds.includes(sollicitatie.markt.id) );

        res.render('PublicProfilePage', { ondernemer, messages, role });
    } catch(err) {
        internalServerErrorPage(res);
    }

};

export const toewijzingenAfwijzingenPage = (
    req: Request,
    res: Response,
    erkenningsNummer: string,
    role: string
) => {

    const messages = getQueryErrors(req.query);

    Promise.all([
        getToewijzingenByOndernemer(erkenningsNummer),
        getAfwijzingenByOndernemer(erkenningsNummer),
        getMarktondernemer(erkenningsNummer),
        getAllBranches(),
        getMarktenEnabled(),
    ]).then(
        ([toewijzingen, afwijzingen, ondernemer, branches, markten]) => {
            res.render('ToewijzingenAfwijzingenPage', { toewijzingen, afwijzingen, ondernemer, role, branches, markten, messages });
        },
        err => internalServerErrorPage(res)(err),
    );
};
