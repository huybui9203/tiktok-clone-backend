import Joi from 'joi';
import ApiError from '~/utils/ApiError';

const createComment = async (req, res, next) => {
    const commentSchema = Joi.object({
        comment: Joi.string().required().max(150).trim(),
        authorVideoId: Joi.number().integer().required(),
        tags: Joi.array().items(
            Joi.object({
                start: Joi.number().integer(),
                end: Joi.number().integer(),
                tag_name: Joi.string(),
                tag_user_id: Joi.number().integer(),
            })
        ),
        parentId: Joi.number().integer(),
        path: Joi.string().trim(),
        videoLink: Joi.string().trim().required(),
    });
    try {
        await commentSchema.validateAsync(req.body);
        next();
    } catch (err) {
        next(new ApiError(422, new Error(err).message));
    }
};

const updateComment = async (req, res, next) => {
    const commentSchema = Joi.object({
        comment: Joi.string().required().max(150).trim(),
        tags: Joi.array().items(
            Joi.object({
                start: Joi.number().integer(),
                end: Joi.number().integer(),
                tag_name: Joi.string(),
            })
        ),
        hasOldTags: Joi.boolean(),
    });
    try {
        await commentSchema.validateAsync(req.body);
        next();
    } catch (err) {
        next(new ApiError(422, new Error(err).message));
    }
};

export { createComment, updateComment };
