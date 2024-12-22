import { StatusCodes } from 'http-status-codes';
import ApiError from '~/utils/ApiError';
import * as userService from '~/services/userService';
import * as emailService from '~/services/emailService';
import * as authService from '~/services/authService';
import * as tokenService from '~/services/tokenService';
import formatDate from '~/utils/formatDate';
import { password } from '~/validations/customValidation';
import { JWT_EXPIRES, jwtTypes } from '~/utils/constants';
import redisClient from '~/config/connectionRedis';

const sendOTPVerificationEmail = async (req, res, next) => {
    try {
        const { email } = req.body;
        const { type } = req.query;
        const user = await userService.getUserbyEmail(email);
        if (type === 'reset-password') {
            if (!user) {
                throw new ApiError(StatusCodes.NOT_FOUND, 'Email not found');
            }
        } else if (type === 'signup') {
            if (user) {
                throw new ApiError(
                    StatusCodes.CONFLICT,
                    'Email already signed up'
                );
            }
        } else {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid request');
        }
        const data = await emailService.sendOTPVerificationEmail(email, type);
        res.status(StatusCodes.CREATED).json({
            data,
            message: 'Verification code email sent',
        });
    } catch (error) {
        next(error);
    }
};

const register = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        const user = await userService.getUserbyEmail(email);
        if (user) {
            throw new ApiError(StatusCodes.CONFLICT, 'Email already signed up');
        }

        await emailService.verifyOTPCode({
            otp,
            email,
        });

        const newUser = await userService.createUser(req.body);

        const data = {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            email_verified_at: formatDate(newUser.email_verified_at),
        };

        delete data.password;

        res.status(StatusCodes.CREATED).json({
            data,
            message: 'Verification successfully',
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await authService.loginWithEmailAndPassword(
            email,
            password
        );

        const tokens = await tokenService.generateAuthTokens(user.id);

        res.cookie('refresh_token', tokens.refresh_token, {
            httpOnly: true,
            // secure: true,
            sameSite: 'Strict',
            maxAge: JWT_EXPIRES.refreshToken * 1000,
        });

        const data = { ...user };
        delete data.password;

        res.status(StatusCodes.OK).json({
            data,
            meta: { token: tokens.access_token, method: 'email' },
            message: 'success',
        });
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { email, otp, password } = req.body;
        const user = await userService.getUserbyEmail(email);
        if (!user) {
            throw new ApiError(StatusCodes.NOT_FOUND, 'Email not found');
        }

        await emailService.verifyOTPCode({
            otp,
            email,
        });

        await userService.updateUserById(user.id, { newPassword: password });

        const tokens = await tokenService.generateAuthTokens(user.id);

        res.cookie('refresh_token', tokens.refresh_token, {
            httpOnly: true,
            // secure: true,
            sameSite: 'Strict',
            maxAge: JWT_EXPIRES.refreshToken * 1000,
        });

        const data = { ...user };
        delete data.password;
        res.status(StatusCodes.OK).json({
            data,
            meta: { token: tokens.access_token },
            message: 'success',
        });
    } catch (error) {
        next(error);
    }
};

const getCurrentUser = async (req, res, next) => {
    try {
        const token = req.get('Authorization')?.split(' ')[1];
        if (!token) {
            throw new ApiError(StatusCodes.UNAUTHORIZED, 'No token provided');
        }

        const payload = tokenService.verifyToken(token, jwtTypes.ACCESS);

        const user = await userService.getUserById(payload.sub);
        const data = { ...user };
        delete data.password;
        res.status(StatusCodes.OK).json({
            data: data,
            message: 'success',
        });
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        const token = req.get('Authorization')?.split(' ')[1];
        if (!token) {
            throw new ApiError(StatusCodes.UNAUTHORIZED, 'No token provided');
        }

        const payload = tokenService.verifyToken(token, jwtTypes.ACCESS);

        res.clearCookie('refresh_token');
        await redisClient.del(`refresh_token:${payload.sub}`);

        res.status(StatusCodes.NO_CONTENT).json();
    } catch (error) {
        next(error);
    }
};

const refeshToken = async (req, res, next) => {
    try {
        const { refresh_token: refreshToken } = req.cookies;
        if (!refreshToken) {
            throw new ApiError(StatusCodes.UNAUTHORIZED, 'No token provided');
        }

        const tokens = await authService.refreshAuths(refreshToken);

        res.cookie('refresh_token', tokens.refresh_token, {
            httpOnly: true,
            // secure: true,
            sameSite: 'Strict',
            maxAge: JWT_EXPIRES.refreshToken * 1000,
        });

        res.status(StatusCodes.CREATED).json({ token: tokens.access_token });
    } catch (error) {
        next(error);
    }
};
export {
    sendOTPVerificationEmail,
    register,
    login,
    logout,
    resetPassword,
    getCurrentUser,
    refeshToken,
};
