import Joi from 'joi';
import validate from '~/utils/validate';

const sendMessage = async (req, res, next) => {
    const schema = Joi.object({
        receiverId: Joi.array().items(Joi.number().integer()).max(50),
        conversationId: Joi.number().integer(),
        message: Joi.string().min(0).max(1000).trim(),
        replyToId: Joi.number().integer(),
        conversationType: Joi.string().valid('self', 'direct', 'group'),
        tempId: Joi.string().trim(),
    });
    validate(schema, req.body)
        .then(() => {
            next();
        })
        .catch(next);
};

const reactMessage = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.number().integer().required(),
        reactionType: Joi.string().trim().required(),
        reactionUser: Joi.string().trim().required(),
        conversationId: Joi.number().integer().required(),
    });
    validate(schema, {
        id: req.params.id,
        reactionType: req.body.reactionType,
        reactionUser: req.body.reactionUser,
        conversationId: req.body.conversationId,
    })
        .then(() => {
            next();
        })
        .catch(next);
};

const removeReaction = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.number().integer().required(),
        reactionId: Joi.number().integer().required(),
        conversationId: Joi.number().integer().required(),
    });
    validate(schema, {
        id: req.params.id,
        reactionId: req.params.reactionId,
        conversationId: req.query.conversationId,
    })
        .then(() => {
            next();
        })
        .catch(next);
};

const getListByCursor = async (req, res, next) => {
    const schema = Joi.object({
        lastTime: Joi.number().integer().required(),
        lastId: Joi.number().integer(),
        id: Joi.number().integer().required(),
    });
    validate(schema, {
        lastTime: req.query.lastTime,
        lastId: req.query.lastId,
        id: req.params.id,
    })
        .then(() => {
            next();
        })
        .catch(next);
};

const getListReactions = async (req, res, next) => {
    const schema = Joi.object({
        lastTime: Joi.number().integer().required(),
        lastId: Joi.number().integer(),
        id: Joi.number().integer().required(),
        type: Joi.string().trim().required(),
    });
    validate(schema, {
        lastTime: req.query.lastTime,
        lastId: req.query.lastId,
        type: req.query.type,
        id: req.params.id,
    })
        .then(() => {
            next();
        })
        .catch(next);
};

const updateLastViewedChat = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.number().integer().required(),
        lastViewedAt: Joi.date().iso().required(),
        status: Joi.string().valid('joined', 'seen', 'left').required(),
    });
    validate(schema, {
        id: req.params.id,
        lastViewedAt: req.body.lastViewedAt,
        status: req.body.status,
    })
        .then(() => {
            next();
        })
        .catch(next);
};

const requiredConversationId = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.number().integer().required(),
    });
    validate(schema, req.params)
        .then(() => {
            next();
        })
        .catch(next);
};

const customizeConversation = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.number().integer().required(),
        name: Joi.string().trim(),
        publicId: Joi.string().trim(),
    });
    validate(schema, {
        id: req.params.id,
        name: req.body.name,
        publicId: req.body.publicId,
    })
        .then(() => {
            next();
        })
        .catch(next);
};

const addMembers = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.number().integer().required(),
        memberIds: Joi.array().items(Joi.number().integer()).max(20),
    });
    validate(schema, {
        id: req.params.id,
        memberIds: req.body.memberIds,
    })
        .then(() => {
            next();
        })
        .catch(next);
};

export {
    sendMessage,
    reactMessage,
    getListByCursor,
    getListReactions,
    removeReaction,
    updateLastViewedChat,
    requiredConversationId,
    customizeConversation,
    addMembers,
};
