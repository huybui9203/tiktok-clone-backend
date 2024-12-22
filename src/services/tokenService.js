import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import env from '~/config/environment';
import ApiError from '~/utils/ApiError';
import redisClient from '~/config/connectionRedis';
import { JWT_EXPIRES, jwtTypes } from '~/utils/constants';

const generateToken = (userId, expires = JWT_EXPIRES.accessToken, secret = env.JWT_SECRET) => {
    const payload = {
        sub: userId,
    };
    return jwt.sign(payload, secret, { expiresIn: expires });
};

const generateAuthTokens = async (userId, ATExpires = JWT_EXPIRES.accessToken, RTExpires = JWT_EXPIRES.refreshToken) => {
    try {
        const access_token = generateToken(userId, ATExpires, env.JWT_SECRET_AT);
        const refresh_token = generateToken(userId, RTExpires, env.JWT_SECRET_RT);

        await redisClient.set(
            `refresh_token:${userId}`,
            refresh_token,
            'EX',
            RTExpires 
        );

        const tokens = { access_token, refresh_token };
        return tokens;
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message)
    }
};

const verifyToken = (token, type) => {
    try {
        const jwtSecret = type === jwtTypes.ACCESS ? env.JWT_SECRET_AT : env.JWT_SECRET_RT
        const decoded = jwt.verify(token, jwtSecret);
        return decoded;
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            throw new ApiError(StatusCodes.UNAUTHORIZED, 'Token has expired');
        } else if (
            err.name === 'JsonWebTokenError' ||
            err.name === 'NotBeforeError'
        ) {
            throw new ApiError(StatusCodes.BAD_REQUEST, err.message);
        }
    }
};



export { generateToken, generateAuthTokens, verifyToken };
