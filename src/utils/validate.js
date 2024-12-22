import { StatusCodes } from 'http-status-codes';
import Joi from 'joi';
import ApiError from './ApiError';

const validate = async (schema = Joi.object({}), value) => {
    try {
        await schema.validateAsync(value, { abortEarly: false });
    } catch (error) {
        throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.message);
    }
};

export default validate

