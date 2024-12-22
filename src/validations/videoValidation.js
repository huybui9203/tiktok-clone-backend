import Joi, { allow } from 'joi';
import ApiError from '~/utils/ApiError';
import validate from '~/utils/validate';

const createVideo = async (req, res, next) => {
    const videoSchema = Joi.object({
        allows: Joi.array().items(Joi.string()),
        description: Joi.string().min(0).max(4000).trim().required(),
        timePostVideo: Joi.string().trim(),
        videoData: Joi.object().required(),
        music: Joi.object().required(),
        viewable: Joi.string().trim().required(),
    });
    validate(videoSchema, req.body)
        .then(() => {
            next();
        })
        .catch(next);
};

export { createVideo };
