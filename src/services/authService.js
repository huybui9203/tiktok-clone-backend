import { Op, where } from 'sequelize';
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import db from '~/models';
import ApiError from '~/utils/ApiError';
import * as userService from './userService';
import * as tokenService from './tokenService';
import redisClient from '~/config/connectionRedis';
import { JWT_EXPIRES, jwtTypes, TOKEN_AUTH_EXPIRES } from '~/utils/constants';

const getOTP = async (email) => {
    return db.UserOTPVerification.findOne({
        where: { email },
    });
};

const generateOTPCode = () => `${Math.floor(100000 + Math.random() * 900000)}`;

const getUserIfNotActive = async (user) => {
    if (user.status === 'Suspended') {
        const expiredTime = await redisClient.get(`user_suspended:${user.id}`);
        if (expiredTime) {
            return { user, isAvailable: false, expiredTime };
        } else {
            await db.User.update(
                { status: 'Active' },
                { where: { id: user.id } }
            );
        }
    } else if (['Inactive', 'Banned'].includes(user.status)) {
        return { user, isAvailable: false };
    }
};

const loginWithEmailAndPassword = async (email, password) => {
    try {
        const user = await userService.getUserbyEmail(email);
        if (!user) {
            throw new ApiError(StatusCodes.UNAUTHORIZED, 'Incorrect email');
        }

        const ressult = await getUserIfNotActive(user);
        if (ressult) {
            return ressult;
        }

        const { password: hashedPassword } = user;

        const validPassword = await bcrypt.compare(password, hashedPassword);
        if (!validPassword) {
            throw new ApiError(StatusCodes.UNAUTHORIZED, 'Incorrect password');
        }
        return { user, isAvailable: true };
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        } else {
            throw new ApiError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                error.message
            );
        }
    }
};

const refreshAuths = async (refreshToken) => {
    try {
        const payload = tokenService.verifyToken(
            refreshToken,
            jwtTypes.REFRESH
        );
        const existRefreshToken = await redisClient.get(
            `refresh_token:${payload.sub}`
        );
        if (!existRefreshToken || existRefreshToken !== refreshToken) {
            console.log(
                '>>>>>>>>>>>>>>',
                'Authenticate failed',
                existRefreshToken
            );
            throw new ApiError(StatusCodes.UNAUTHORIZED, 'Authenticate failed');
        }
        await redisClient.del(`refresh_token:${payload.sub}`);
        const remainRTExpires = Math.floor(payload.exp - Date.now() / 1000);
        const tokens = await tokenService.generateAuthTokens(
            payload.sub,
            payload.role,
            JWT_EXPIRES.accessToken,
            remainRTExpires
        );

        return tokens;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        } else {
            throw new ApiError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                error.message
            );
        }
    }
};

const saveTokenAuth = async (socialId, tokenAuth, socialType) => {
    try {
        await redisClient.set(
            `${socialType}_token_auth:${socialId}`,
            tokenAuth,
            'EX',
            TOKEN_AUTH_EXPIRES
        );
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
};

const loginWithSocial = async (socialId, tokenAuth, socialType) => {
    try {
        const [token, user] = await Promise.all([
            redisClient.get(`${socialType}_token_auth:${socialId}`),
            db.User.findOne({
                where: {
                    [Op.and]: [
                        { social_id: socialId },
                        { social_type: socialType },
                    ],
                },
            }),
        ]);

        if (token !== tokenAuth || !user) {
            throw new ApiError(
                StatusCodes.UNAUTHORIZED,
                'Authentication failed'
            );
        }
        await redisClient.del(`${socialType}_token_auth:${socialId}`);
        return user;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        } else {
            throw new ApiError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                error.message
            );
        }
    }
};

export {
    getOTP,
    generateOTPCode,
    loginWithEmailAndPassword,
    refreshAuths,
    loginWithSocial,
    saveTokenAuth,
    getUserIfNotActive,
};
