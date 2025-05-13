import Joi from 'joi';
import validate from '~/utils/validate';

const getReportDetail = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.number().integer().required(),
        type: Joi.string().trim().required(),
    });
    validate(schema, {
        id: req.params.id,
        type: req.query.type,
    })
        .then(() => {
            next();
        })
        .catch(next);
};

const handleReport = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.number().integer().required(),
        objectId: Joi.number().integer().required(),
        objectType: Joi.string()
            .valid('video', 'comment', 'user', 'group')
            .required(),
        ownerId: Joi.number().integer().required(),
        action: Joi.string().valid('delete', 'keep').required(),
    });
    validate(schema, {
        id: req.params.id,
        objectId: req.body.objectId,
        objectType: req.body.objectType,
        ownerId: req.body.ownerId,
        action: req.body.action,
    })
        .then(() => {
            next();
        })
        .catch(next);
};

export { getReportDetail, handleReport };
