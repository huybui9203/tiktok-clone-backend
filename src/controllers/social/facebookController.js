import { v4 as uuidv4 } from 'uuid';
import passport from 'passport';
import env from '~/config/environment';
import { facebookStrategy } from '~/config/passport';
import * as authService from '~/services/authService';
import * as socialController from './socialController'

passport.use(facebookStrategy);

const facebookAuth = () =>
    passport.authenticate('facebook', { session: false });

const facebookCallbackAuth = (req, res, next) => {
    passport.authenticate(
        'facebook',
        {
            session: false,
        },
        (err, user, info) => {
            if (err) {
                return res.redirect(
                    'http://localhost:3000/oauth?social=facebook&authentication=failure&reason=server-error'
                );
            }
            req.user = user;
            next();
        }
    )(req, res, next);
};

const redirect = async (req, res) => {
    const tokenAuth = uuidv4();
    const user = req.user;
    await authService.saveTokenAuth(user.social_id, tokenAuth, user.social_type);
    res.redirect(
        `${env.URL_CLIENT}/oauth?social=facebook&id=${user?.social_id}&token=${tokenAuth}`
    );
};

const loginWithFacebook = (req, res, next) => {
    socialController.loginWithSocial(req, res, next)
}

export { facebookAuth, facebookCallbackAuth, redirect, loginWithFacebook };
