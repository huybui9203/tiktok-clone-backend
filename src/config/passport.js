import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import env from './environment';
import db from '~/models';
import { Op } from 'sequelize';
import * as userService from '~/services/userService';
import { StatusCodes } from 'http-status-codes';
import { uploadImageToCloud } from '~/utils/uploadFile';
import generateUniqueUsername from '~/utils/generateUniqueUsername';

const googleOptions = {
    clientID: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackURL: env.GOOGLE_CALLBACK_URL,
};

const googleVerify = async (accessToken, refreshToken, profile, cb) => {
    const ggData = {
        social_id: profile.id,
        nickname: profile.displayName,
        first_name: profile.name?.givenName,
        last_name: profile.name?.familyName,
        social_type: profile.provider,
        avatar:
            profile.photos && profile.photos.length > 0
                ? profile.photos[0].value
                : '',
        email:
            profile.emails && profile.emails.length > 0
                ? profile.emails[0].value
                : '',
    };

    try {
        const user = await userService.getUserbyEmail(ggData.email);
        if (user && user.social_type !== ggData.social_type) {
            return cb(null, false, {
                message: 'Email has already signed up',
                status: StatusCodes.CONFLICT,
            });
        }
        if (user && user.social_type === ggData.social_type) {
            return cb(null, user);
        }

        ggData.username = generateUniqueUsername([
            ggData.first_name,
            ggData.last_name,
        ]);

        const [err, image] = await uploadImageToCloud(ggData.avatar);
        if (err) {
            throw err;
        } else {
            // avatar = image.url
            ggData.avatar = {
                public_id: image.public_id,
                lg: image.secure_url,
                sm: image.eager[0].secure_url,
            };
        }

        const newUser = await db.User.create(ggData);
        return cb(null, newUser.get({ plain: true }));
    } catch (error) {
        console.log(error);
        return cb(error);
    }
};

const facebookOptions = {
    clientID: env.FACEBOOK_APP_ID,
    clientSecret: env.FACEBOOK_APP_SECRET,
    callbackURL: env.FACEBOOK_CALLBACK_URL,
    profileFields: ['id', 'displayName', 'photos', 'first_name', 'last_name'],
};

const facebookVerify = async (accessToken, refreshToken, profile, cb) => {
    console.log('>>>', profile);
    const fbData = {
        social_id: profile.id,
        nickname: profile.displayName,
        first_name: profile.name?.givenName,
        last_name: profile.name?.familyName,
        social_type: profile.provider,
        avatar:
            profile.photos && profile.photos.length > 0
                ? profile.photos[0].value
                : '',
    };

    try {
        const user = await db.User.findOne({
            where: {
                [Op.and]: [
                    { social_id: fbData.social_id },
                    { social_type: fbData.social_type },
                ],
            },
        });

        if (user) {
            return cb(null, user);
        }

        fbData.username = generateUniqueUsername([
            fbData.first_name,
            fbData.last_name,
        ]);

        const [err, image] = await uploadImageToCloud(fbData.avatar);
        if (err) {
            throw err;
        } else {
            fbData.avatar = {
                public_id: image.public_id,
                lg: image.secure_url,
                sm: image.eager[0].secure_url,
            };
        }

        const newUser = await db.User.create(fbData);
        return cb(null, newUser.get({ plain: true }));
    } catch (error) {
        console.log(error);
        return cb(error);
    }
};

const googleStrategy = new GoogleStrategy(googleOptions, googleVerify);
const facebookStrategy = new FacebookStrategy(facebookOptions, facebookVerify);

export { googleStrategy, facebookStrategy };
