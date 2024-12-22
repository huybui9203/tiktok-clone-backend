import { v4 as uuidv4 } from 'uuid';
import passport from 'passport';
import env from '~/config/environment';
import { StatusCodes } from 'http-status-codes';
import { googleStrategy } from '~/config/passport';
import * as authService from '~/services/authService';
import * as socialController from './socialController'

passport.use(googleStrategy);

const googleAuth = () =>
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
    });

const googleCallbackAuth = (req, res, next) => {
    passport.authenticate('google', {
        session: false,
    }, (err, user, info)=> {
        if (err) { 
            return res.redirect('http://localhost:3000/oauth?social=google&authentication=failure&reason=server-error')
        }
        if (!user) { 
            if(info?.status === StatusCodes.CONFLICT) {
                return res.redirect('http://localhost:3000/oauth?social=google&authentication=failure&reason=email-exist')
            } 
            return res.redirect('http://localhost:3000/oauth?social=google&authentication=failure')
         }
        req.user = user
        next()
    })(req, res, next);
}
    

const redirect = async (req, res) => {
    const tokenAuth = uuidv4();
    const user = req.user
    await authService.saveTokenAuth(user.social_id, tokenAuth, user.social_type);
    res.redirect(
        `${env.URL_CLIENT}/oauth?social=google&id=${user?.social_id}&token=${tokenAuth}`
    );
};

const loginWithGoogle = (req, res, next) => {
    socialController.loginWithSocial(req, res, next)
}

export { googleAuth, googleCallbackAuth, redirect, loginWithGoogle };
