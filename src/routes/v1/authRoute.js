import { Router } from 'express';
import * as authController from '~/controllers/authController';
import * as authValidation from '~/validations/authValidation';
import * as googleController from '~/controllers/social/googleController';
import * as facebookController from '~/controllers/social/facebookController';

const router = Router();

router.post(
    '/send-code',
    authValidation.isValidEmail,
    authController.sendOTPVerificationEmail
);
router.post('/register', authValidation.register, authController.register);
router.post('/login', authValidation.login, authController.login);
router.post(
    '/reset-password',
    authValidation.resetPassword,
    authController.resetPassword
);
router.get('/me', authController.getCurrentUser);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refeshToken);

//google
router.get('/google', googleController.googleAuth());

router.get(
    '/google/callback',
    googleController.googleCallbackAuth,
    googleController.redirect
);

router.post(
    '/google/login',
    authValidation.loginWithSocial,
    googleController.loginWithGoogle
);

//facebook
router.get('/facebook', facebookController.facebookAuth());

router.get(
    '/facebook/callback',
    facebookController.facebookCallbackAuth,
    facebookController.redirect
);

router.post(
    '/facebook/login',
    authValidation.loginWithSocial,
    facebookController.loginWithFacebook
);
export default router;
