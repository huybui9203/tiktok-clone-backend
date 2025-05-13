import Joi from 'joi';
import validate from '~/utils/validate';
import { password } from '~/validations/customValidation';

const createUser = async (req, res, next) => {
    const profileSchema = Joi.object({
        email: Joi.string().email().trim().required(),
        password: Joi.string().custom(password).trim().required(),
        role: Joi.string().valid('admin', 'user').required(),
    });
    validate(profileSchema, req.body)
        .then(() => {
            next();
        })
        .catch(next);
};

const updateUser = async (req, res, next) => {
    const profileSchema = Joi.object({
        username: Joi.string().max(24).trim(),
        email: Joi.string().email().trim(),
        password: Joi.string().custom(password).trim(),
        role: Joi.string().valid('admin', 'user'),
        status: Joi.string().valid('Active', 'Banned', 'Inactive', 'Suspended'),
        publicAvtId: Joi.string().trim(),
        suspend_expire: Joi.number().integer(),
        isVerified: Joi.boolean(),
    });
    validate(profileSchema, req.body)
        .then(() => {
            next();
        })
        .catch(next);
};

export { createUser, updateUser };
