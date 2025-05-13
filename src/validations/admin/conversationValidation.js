import Joi from 'joi';
import validate from '~/utils/validate';

const requiredIDParams = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.number().integer().required(),
    });
    validate(schema, {
        id: req.params.id,
    })
        .then(() => {
            next();
        })
        .catch(next);
};

export { requiredIDParams };
