import { Request, Response } from 'express';
import { deleteAllocationsByErkenningsnummer } from '../model/allocation.functions';
import { deletePlaatsvoorkeurenByErkenningsnummer } from '../model/plaatsvoorkeur.functions';
import { deleteRsvpsByErkenningsnummer } from '../model/rsvp.functions';
import { deleteVoorkeurenByErkenningsnummer } from '../model/voorkeur.functions';
import { getMarktenEnabled } from '../model/markt.functions';
import { getMarktondernemer } from '../makkelijkemarkt-api';
import { getQueryErrors } from '../express-util';
import { MMSollicitatie } from '../makkelijkemarkt.model';

export const deleteUserPage = ( req: Request, res: Response, result: string, error: string ) => {
    return res.render('DeleteUserPage', { result, error });
};

export const deleteUser = (req: Request, res: Response, erkenningsNummer: string) => {
    Promise.all([
        deleteAllocationsByErkenningsnummer(erkenningsNummer),
        deletePlaatsvoorkeurenByErkenningsnummer(erkenningsNummer),
        deleteRsvpsByErkenningsnummer(erkenningsNummer),
        deleteVoorkeurenByErkenningsnummer(erkenningsNummer)
    ])
    .then( (result) => {
        const numberOfRecordsFound = result.reduce((a,b) => a + b, 0);
        deleteUserPage(req, res, `${numberOfRecordsFound} records mbt registratienummer '${req.body.erkenningsNummer}' verwijderd`, null);
    })
    .catch( ( e: string ) => {
        deleteUserPage(req, res, null, e);
        throw new Error(e);
    });

};

export const publicProfilePage = async (req: Request, res: Response, erkenningsNummer: string) => {

    const messages = getQueryErrors(req.query);

    try {
        const ondernemer = await getMarktondernemer(erkenningsNummer);
        const marktenEnabled = await getMarktenEnabled();

        const marktenEnabledIds = marktenEnabled.map( (markt: any) => markt.id);
        ondernemer.sollicitaties = ondernemer.sollicitaties.filter((sollicitatie: MMSollicitatie) => marktenEnabledIds.includes(sollicitatie.markt.id) );

        res.render('PublicProfilePage', { ondernemer, messages });
    } catch(err) {
        res.status(500).end(String(err));
    }

};

