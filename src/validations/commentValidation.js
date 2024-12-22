import Joi from 'joi';
import ApiError from '~/utils/ApiError';

const createNew = async (req, res, next) => {
    const comment = Joi.object({
        comment: Joi.string().required().max(150).trim(),
    });
    try {
        await comment.validateAsync(req.body);
        next();
    } catch (err) {
        next(new ApiError(422, new Error(err).message))
    }
};

export { createNew };
