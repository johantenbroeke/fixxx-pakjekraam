import { Request, Response } from 'express';
import {
    getAanmeldingen,
    getIndelingslijst,
    getToewijzingen,
    getMarktPaginas,
    getMarktGeografie,
    getMarktplaatsen,
    getPlaatsvoorkeuren,
    getAllBranches,
} from '../pakjekraam-api';
import {
    getMarkt,
    getMarktondernemersByMarkt
} from '../makkelijkemarkt-api';
import { internalServerErrorPage } from '../express-util';
import { getVoorkeurenByMarkt } from '../model/voorkeur.functions';
import { KeycloakRoles } from '../permissions';
import { getKeycloakUser } from '../keycloak-api';

import { GrantedRequest } from 'keycloak-connect';

export const getIndelingslijstData = (marktId: string, marktDate: string) =>
    getMarkt(marktId).then( mmarkt => {
        return Promise.all([
            getMarktondernemersByMarkt(marktId),
            getAanmeldingen(marktId, marktDate),
            getMarkt(marktId),
            getMarktPaginas(mmarkt),
            getToewijzingen(marktId, marktDate),
            getMarktGeografie(mmarkt),
            getMarktplaatsen(mmarkt),
            getPlaatsvoorkeuren(marktId),
            getVoorkeurenByMarkt(marktId),
            getAllBranches(),
        ]).then( result => {
            const [
                ondernemers,
                aanmeldingen,
                markt,
                paginas,
                toewijzingen,
                geografie,
                marktplaatsen,
                plaatsvoorkeuren,
                voorkeuren,
                branches,
            ] = result;
            return {
                ondernemers,
                aanmeldingen,
                markt,
                paginas,
                toewijzingen,
                obstakels: geografie.obstakels || [],
                marktplaatsen,
                plaatsvoorkeuren,
                voorkeuren,
                branches
            };
        });
    });


export const indelingslijstPage = (req: GrantedRequest, res: Response) => {
    const { marktDate, marktId } = req.params;
    const type = 'concept-indelingslijst';

    const role = KeycloakRoles.MARKTMEESTER;

    Promise.all([
        getIndelingslijst(marktId, marktDate),
        getVoorkeurenByMarkt(marktId)
    ])
        .then((data: any) => {
            const [
                indelingslijst,
                voorkeuren,
            ] = data;

            indelingslijst.plaatsvoorkeuren = indelingslijst.voorkeuren;
            indelingslijst.voorkeuren = voorkeuren;

            return res.render('IndelingslijstPage.tsx', {
                ...indelingslijst,
                datum: marktDate,
                type,
                role,
                user: getKeycloakUser(req)
            });
        }, internalServerErrorPage(res));
};

export const marketAllocationPage = (req: GrantedRequest, res: Response) => {

    const { marktDate, marktId } = req.params;
    getIndelingslijstData(marktId, marktDate).then(data => {
        res.render('IndelingslijstPage.tsx', {
            ...data,
            datum: marktDate,
            type:'wenperiode',
            role: KeycloakRoles.MARKTMEESTER,
            user: getKeycloakUser(req)
        });
    }, internalServerErrorPage(res));

};


export const indelingPage = (req: GrantedRequest, res: Response) => {

    const { marktDate } = req.params;
    getIndelingslijstData(req.params.marktId, marktDate)
        .then(data => {
            res.render('IndelingslijstPage.tsx', {
                ...data,
                datum: marktDate,
                type: 'indeling',
                role: KeycloakRoles.MARKTMEESTER,
                user: getKeycloakUser(req)
            });
        }, internalServerErrorPage(res));

};
