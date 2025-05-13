import Joi from 'joi';
import validate from '~/utils/validate';

const getListByCursor = async (req, res, next) => {
    const schema = Joi.object({
        lastTime: Joi.number().integer().required(),
        lastId: Joi.number().integer(),
        type: Joi.string().trim().required(),
    });
    validate(schema, {
        lastTime: req.query.lastTime,
        lastId: req.query.lastId,
        type: req.query.type,
    })
        .then(() => {
            next();
        })
        .catch(next);
};

const markAsReadOrUnRead = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.number().integer(),
        isRead: Joi.boolean().required(),
    });
    validate(schema, {
        id: req.params.id,
        isRead: req.body.isRead,
    })
        .then(() => {
            next();
        })
        .catch(next);
};

const deleteNotification = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.number().integer(),
    });
    validate(schema, {
        id: req.params.id,
    })
        .then(() => {
            next();
        })
        .catch(next);
};

export { getListByCursor, markAsReadOrUnRead, deleteNotification };
