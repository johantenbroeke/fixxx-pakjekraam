import { Request, Response } from 'express';
import { GrantedRequest } from 'keycloak-connect';

import { internalServerErrorPage } from '../express-util';

import { getKeycloakUser } from '../keycloak-api';


export const uploadMarkten = (
    req: GrantedRequest,
    res: Response,
    role: String,
) => {

    Promise.all([
    ])
    .then(([
        toewijzingen,
    ]) => {
        res.render('UploadMarktenPage', {
            user: getKeycloakUser(req),
            role,
        });
    })
    .catch(err => internalServerErrorPage(res)(err));

};
