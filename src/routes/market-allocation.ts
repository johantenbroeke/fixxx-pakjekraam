import { Request, Response } from 'express';
import { GrantedRequest } from 'keycloak-connect';

import { internalServerErrorPage } from '../express-util';
import { Roles } from '../authentication';

import { getKeycloakUser } from '../keycloak-api';
import {
    calculateIndelingslijst,
    getIndelingslijst,
} from '../pakjekraam-api';

export const conceptIndelingPage = (req: GrantedRequest, res: Response) => {
    const { marktDate, marktId } = req.params;

    calculateIndelingslijst(marktId, marktDate)
    .then(conceptIndeling => {
        return res.render('IndelingslijstPage.tsx', {
            ...conceptIndeling,
            datum: marktDate,
            type: 'concept-indelingslijst',
            role: Roles.MARKTMEESTER,
            user: getKeycloakUser(req)
        });
    }, internalServerErrorPage(res));
};

export const indelingPage = (req: GrantedRequest, res: Response, type: string = 'indeling') => {
    const { marktDate, marktId } = req.params;

    getIndelingslijst(marktId, marktDate)
    .then(indeling => {
        res.render('IndelingslijstPage.tsx', {
            ...indeling,
            type,
            datum : marktDate,
            role  : Roles.MARKTMEESTER,
            user  : getKeycloakUser(req)
        });
    }, internalServerErrorPage(res));
};
