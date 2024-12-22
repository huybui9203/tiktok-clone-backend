import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import { uid } from 'uid/single';
import env from '~/config/environment';
import ApiError from '~/utils/ApiError';
import db from '~/models';
import { where } from 'sequelize';
import * as authService from './authService';
import { StatusCodes } from 'http-status-codes';
import { OTP_EXPIRES, SALT_ROUNDS } from '~/utils/constants';
import redisClient from '~/config/connectionRedis';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: env.SMPT_MAIL,
        pass: env.SMPT_APP_PASS,
    },
});

const testConnectMail = () => {
    if (['development', 'test'].includes(env.BUILD_MODE)) {
        transporter.verify((error, success) => {
            if (error) {
                console.log('>> Unable to connect to email server!');
            } else {
                console.log('>> Connected to email server!');
            }
        });
    }
};

const sendOTPVerificationEmail = async (email, type) => {
    try {
        await redisClient.del(`email_verification:${email}`);
        const newOTPCode = authService.generateOTPCode(); //6 digits
        const hashedOTPCode = await bcrypt.hash(newOTPCode, SALT_ROUNDS);

        await redisClient.hset(`email_verification:${email}`, {
            otp_code: hashedOTPCode,
            type,
        });

        await redisClient.expire(`email_verification:${email}`, OTP_EXPIRES);

        const mailOptions = {
            from: env.SMPT_MAIL,
            to: email,
            subject: 'Verify Your Email',
            html: `<p>Enter <b>${newOTPCode}</b> in the app to verify your email address and complete the sign up process.<p>This code <b>expires in 1 minute.</b></p>`,
        };

        await transporter.sendMail(mailOptions);
        return { email, type };
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
};

const verifyOTPCode = async ({ otp, email }) => {
    try {
        const hashedOTPCode = await redisClient.hget(
            `email_verification:${email}`,
            'otp_code'
        );
        if (!hashedOTPCode) {
            throw new ApiError(
                StatusCodes.NOT_FOUND,
                'verification code not found or has expired'
            );
        }

        const validOTPCode = await bcrypt.compare(otp, hashedOTPCode);
        if (!validOTPCode) {
            throw new ApiError(
                StatusCodes.UNPROCESSABLE_ENTITY,
                'Invalid code passed'
            );
        }
        await redisClient.del(`email_verification:${email}`);
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
    transporter,
    sendOTPVerificationEmail,
    verifyOTPCode,
    testConnectMail,
};
