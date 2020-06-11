import { stringify } from 'qs';
import { Router } from 'express';
import ClientRepresentation from 'keycloak-admin/lib/defs/clientRepresentation';

import {
    HTTP_PAGE_NOT_FOUND,
    forbiddenErrorPage,
    publicErrors,
    getQueryErrors,
    internalServerErrorPage,
    redirectWithParams
} from '../express-util';
import {
    userExists,
    getKeycloakAdmin
} from '../keycloak-api';

import {
    checkActivationCode
} from '../makkelijkemarkt-api';

module.exports = () => {
    const router = Router();

    router.route('/activeren')
    .get(activationPage)
    .post(handleActivation);

    router.route('/registreren')
    .get(registrationPage)
    .post(handleRegistration);

    router.get('/welkom', (req, res) => {
        res.render('AccountCreatedPage', {});
    });

    return router;
};

const activationPage = (req, res) => {
    res.render('ActivatePage', {
        username: req.query.username,
        code: req.query.code,
        messages: getQueryErrors(req.query),
    });
};

const handleActivation = (req, res) => {
    const { username, code } = req.body;

    if (username.includes('.')) {
        throw publicErrors.USERNAME_CONTAINS_DOT;
    } else if (!code) {
        throw publicErrors.ACTIVATION_CODE_NOT_SET;
    }

    Promise.all([
        checkActivationCode(username, code),
        userExists(username)
    ])
    .then(([ isValid, isExistingUser ]) => {
        if (!isValid) {
            throw publicErrors.ACTIVATION_CODE_INCORRECT;
        } else if (isExistingUser) {
            throw publicErrors.ACCOUNT_EXISTS_ALREADY;
        }

        req.session.activation = { username };
        return res.redirect('/registreren');
    })
    .catch(error => {
        if (typeof error === 'string') {
            redirectWithParams(res, { error, username, code });
        } else {
            internalServerErrorPage(res);
        }
    });
};

const registrationPage = (req, res) => {
    if (req.session.activation) {
        res.render('RegistrationPage', {
            code: req.session.activation.code,
            email: req.query.email,
            messages: getQueryErrors(req.query),
            username: req.session.activation.username,
        });
    } else {
        res.redirect('/activeren');
    }
};

const handleRegistration = (req, res) => {
    const { password, email } = req.body;

    if (!req.session.activation) {
        return forbiddenErrorPage(res)('');
    } else if (req.body.password !== req.body.passwordRepeat) {
        return res.redirect(
            `/registreren${stringify(
                { email, error: publicErrors.NON_MATCHING_PASSWORDS },
                { addQueryPrefix: true }
            )}`
        );
    }

    getKeycloakAdmin()
    .then(kcAdminClient => {
        kcAdminClient.users.create({
            username: req.session.activation.username,
            email,
            enabled: true,
        })
        .then(user => {
            return kcAdminClient.users.resetPassword({
                id: user.id,
                credential: {
                    temporary: false,
                    type: 'password',
                    value: password,
                },
            });
        })
        .then(() => {
            delete req.session.activation;
            res.redirect('/welkom');
        })
        .catch(internalServerErrorPage(res));
    });
};
