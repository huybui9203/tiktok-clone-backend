import Joi from 'joi';
import ApiError from '~/utils/ApiError';
import validate from '~/utils/validate';

const updateUser = async (req, res, next) => {
    const userSchema = Joi.object({
        first_name: Joi.string().min(0).max(50).trim(),
        last_name: Joi.string().min(0).max(50).trim(),
        username: Joi.string().max(24).trim().required(),
        nickname: Joi.string().min(0).max(30).trim(),
        avatar: Joi.string().uri().trim(),
        gender: Joi.string().valid('male', 'female', 'other'),
        bio: Joi.string().min(0).max(80).trim(),
        email: Joi.string().email().trim(),
        password: Joi.string()
            .min(8)
            .max(20)
            .pattern(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/
            )
            .trim(),
        social_id: Joi.string().trim(),
        social_type: Joi.string().valid(
            'facebook',
            'google',
            'twitter',
            'instagram'
        ),
        tick: Joi.boolean().default(false),
        date_of_birth: Joi.date(),
        website_url: Joi.string().uri(),
        facebook_url: Joi.string().uri(),
        youtube_url: Joi.string().uri(),
        twitter_url: Joi.string().uri(),
        instagram_url: Joi.string().uri(),
        email_verified_at: Joi.date(),
    });
    try {
        await userSchema.validateAsync(req.body, { abortEarly: false });
        next();
    } catch (err) {
        next(new ApiError(422, new Error(err).message));
    }
};

const updateProfile = async (req, res, next) => {
    const profileSchema = Joi.object({
        username: Joi.string().max(24).trim(),
        nickname: Joi.string().min(0).max(30).trim(),
        bio: Joi.string().min(0).max(80).trim(),
        publicId: Joi.string().trim(),
    });
    validate(profileSchema, req.body)
        .then(() => {
            next();
        })
        .catch(next);
};

export { updateUser, updateProfile };
