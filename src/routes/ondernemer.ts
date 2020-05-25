import { Request, Response } from 'express';
import { GrantedRequest } from 'keycloak-connect';

import { getQueryErrors, internalServerErrorPage } from '../express-util';
import { KeycloakRoles } from '../permissions';
import { getKeycloakUser } from '../keycloak-api';

import { MMSollicitatie } from '../makkelijkemarkt.model';

import {
    getMarkten,
    getOndernemer
} from '../makkelijkemarkt-api';
import {
    getAllBranches
} from '../pakjekraam-api';

import { deletePlaatsvoorkeurenByErkenningsnummer } from '../model/plaatsvoorkeur.functions';
import { getToewijzingenByOndernemer } from '../model/allocation.functions';
import { deleteRsvpsByErkenningsnummer } from '../model/rsvp.functions';
import { deleteVoorkeurenByErkenningsnummer } from '../model/voorkeur.functions';

import { getAfwijzingenByOndernemer } from '../model/afwijzing.functions';

export const deleteUserPage = ( req: GrantedRequest, res: Response, result: string, error: string, csrfToken: string, role: string) => {
    return res.render('DeleteUserPage', {
        result,
        error,
        csrfToken,
        role,
        user: getKeycloakUser(req)
    });
};

export const deleteUser = (req: GrantedRequest, res: Response, erkenningsNummer: string) => {
    Promise.all([
        deletePlaatsvoorkeurenByErkenningsnummer(erkenningsNummer),
        deleteRsvpsByErkenningsnummer(erkenningsNummer),
        deleteVoorkeurenByErkenningsnummer(erkenningsNummer)
    ])
    .then( (result) => {
        const numberOfRecordsFound = result.reduce((a,b) => a + b, 0);
        deleteUserPage(
            req,
            res,
            `${numberOfRecordsFound} records mbt registratienummer '${req.body.erkenningsNummer}' verwijderd`,
            null,
            req.csrfToken(),
            KeycloakRoles.MARKTMEESTER,
        );
    })
    .catch( ( e: string ) => {
        internalServerErrorPage(res);
    });
};

export const publicProfilePage = async (
    req: GrantedRequest,
    res: Response,
    erkenningsNummer: string,
    role: string
) => {
    const messages = getQueryErrors(req.query);

    try {
        const ondernemer = await getOndernemer(erkenningsNummer);
        const marktenEnabled = await getMarkten(true);
        const marktenEnabledIds = marktenEnabled.map( (markt: any) => markt.id);
        ondernemer.sollicitaties = ondernemer.sollicitaties.filter((sollicitatie: MMSollicitatie) =>
            marktenEnabledIds.includes(sollicitatie.markt.id)
        );

        res.render('PublicProfilePage', { ondernemer, messages, role, user: getKeycloakUser(req) });
    } catch(err) {
        internalServerErrorPage(res);
    }
};

export const toewijzingenAfwijzingenPage = (
    req: GrantedRequest,
    res: Response,
    erkenningsNummer: string,
    role: string
) => {

    const messages = getQueryErrors(req.query);

    Promise.all([
        getToewijzingenByOndernemer(erkenningsNummer),
        getAfwijzingenByOndernemer(erkenningsNummer),
        getOndernemer(erkenningsNummer),
        getAllBranches(),
        getMarkten(),
    ]).then(
        ([toewijzingen, afwijzingen, ondernemer, branches, markten]) => {

            const marktenLive = markten.filter(markt => markt.kiesJeKraamFase === 'live').map( markt => markt.id);

            afwijzingen = afwijzingen.filter(afwijzing => {
                return marktenLive.includes(afwijzing.marktId);
            });

            toewijzingen = toewijzingen.filter(toewijzing => {
                return marktenLive.includes(parseInt(toewijzing.marktId));
            });

            res.render('ToewijzingenAfwijzingenPage', {
                toewijzingen,
                afwijzingen,
                ondernemer,
                role,
                branches,
                markten,
                messages,
                user: getKeycloakUser(req)
            });
        },
        err => internalServerErrorPage(res)(err),
    );
};
