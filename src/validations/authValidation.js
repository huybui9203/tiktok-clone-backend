import Joi from 'joi';
import ApiError from '~/utils/ApiError';
import { password } from './customValidation';
import { StatusCodes } from 'http-status-codes';
import validate from '~/utils/validate';

const register = async (req, res, next) => {
    const authSchema = Joi.object({
        month: Joi.number().integer().required(),
        day: Joi.number().integer().required(),
        year: Joi.number().integer().required(),
        email: Joi.string().email().trim().required(),
        password: Joi.string().custom(password).trim().required(),
        otp: Joi.string().trim().required(),
    });

    validate(authSchema, req.body)
        .then(() => {
            next();
        })
        .catch(next);
};

const login = async (req, res, next) => {
    const body = Joi.object({
        email: Joi.string().email().trim().required(),
        password: Joi.string().trim().required(),
    });

    validate(body, req.body)
        .then(() => {
            next();
        })
        .catch(next);
};

const resetPassword = async (req, res, next) => {
    const body = Joi.object({
        email: Joi.string().email().trim().required(),
        otp: Joi.string().trim().required(),
        password: Joi.string().custom(password).trim().required(),
    });

    validate(body, req.body)
        .then(() => {
            next();
        })
        .catch(next);
};

const isValidEmail = async (req, res, next) => {
    const email = Joi.object({
        email: Joi.string().email().trim().required(),
    });

    validate(email, req.body)
        .then(() => {
            next();
        })
        .catch(next);
};

const loginWithSocial = async (req, res, next) => {
    const body = Joi.object({
        socialId: Joi.string().trim().required(),
        tokenAuth: Joi.string().trim().required(),
        socialType: Joi.string().trim().required(),
    });

    validate(body, req.body)
        .then(() => {
            next();
        })
        .catch(next);
};
export { register, login, isValidEmail, resetPassword, loginWithSocial };
