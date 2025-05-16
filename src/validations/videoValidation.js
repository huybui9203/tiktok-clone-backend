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
        viewable: Joi.string().valid('private', 'public', 'friends').required(),
        categoryId: Joi.number().integer().required()
    });
    validate(videoSchema, req.body)
        .then(() => {
            next();
        })
        .catch(next);
};

const changePrivacy = async (req, res, next) => {
    const videoSchema = Joi.object({
        viewable: Joi.string().valid('private', 'public', 'friends').required(),
    });
    validate(videoSchema, req.body)
        .then(() => {
            next();
        })
        .catch(next);
};

const shareVideoInChat = async (req, res, next) => {
    const schema = Joi.object({
        optionalMessage: Joi.string().min(0).max(1000).trim(),
        sharedData: Joi.object({
            post: Joi.object({
                url: Joi.string().trim().required(),
                desc: Joi.string(),
                type: Joi.string().required(),
                preview: Joi.string().trim(),
            }),
            author: Joi.object({
                name: Joi.string(),
                avatar: Joi.string().trim(),
            }),
        }),
        postId: Joi.number().integer().required(),
        conversationIds: Joi.array().items(Joi.number().integer()).max(10),
        userIds: Joi.array().items(Joi.number().integer()).max(10),
    });
    validate(schema, req.body)
        .then(() => {
            next();
        })
        .catch(next);
};

const shareVideoByRepost = async (req, res, next) => {
    const schema = Joi.object({
        postId: Joi.number().integer().required(),
        caption: Joi.string().min(0).max(1000).trim(),
    });
    validate(schema, req.body)
        .then(() => {
            next();
        })
        .catch(next);
};

const addView = async (req, res, next) => {
    const schema = Joi.object({
        videoId: Joi.number().integer().required(),
        videoUserId: Joi.number().integer().required(),
        duration: Joi.number().required(),
        lastViewAt: Joi.alternatives().try(Joi.date().iso(), Joi.valid(null)),
        viewNumber: Joi.alternatives().try(
            Joi.number().integer(),
            Joi.valid(null)
        ),
    });
    validate(schema, req.body)
        .then(() => {
            next();
        })
        .catch(next);
};

const getVideo = async (req, res, next) => {
    const schema = Joi.object({
        uuid: Joi.string().uuid().required(),
        author: Joi.string().trim().required(),
    });
    validate(schema, { uuid: req.params.uuid, author: req.query.author })
        .then(() => {
            next();
        })
        .catch(next);
};

const report = async (req, res, next) => {
    const schema = Joi.object({
        objectId: Joi.number().integer().required(),
        objectType: Joi.string()
            .valid('user', 'video', 'comment', 'group')
            .required(),
        reasonId: Joi.number().integer().required(),
        ownerId: Joi.number().integer().required(),
    });
    validate(schema, req.body)
        .then(() => {
            next();
        })
        .catch(next);
};

const unreport = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.number().integer().required(),
        objectType: Joi.string()
            .valid('user', 'video', 'comment', 'group')
            .required(),
    });
    validate(schema, {
        id: req.params.id,
        objectType: req.query.type,
    })
        .then(() => {
            next();
        })
        .catch(next);
};

const requiredIDParams = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.number().integer().required(),
    });
    validate(schema, req.params)
        .then(() => {
            next();
        })
        .catch(next);
};

const deleteVideo = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.number().integer().required(),
        authorId: Joi.number().integer().required(),
    });
    validate(schema, { id: req.params.id, authorId: req.query.authorId })
        .then(() => {
            next();
        })
        .catch(next);
};

const updateVideo = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.number().integer().required(),
        categoryId: Joi.number().integer(),
        allows: Joi.array().items(Joi.string()),
        description: Joi.string().min(0).max(4000).trim(),
    });
    validate(schema, {
        id: req.params.id,
        categoryId: req.body.categoryId,
        allows: req.body.allows,
        description: req.body.description,
    })
        .then(() => {
            next();
        })
        .catch(next);
};

const approvedVideo = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.number().integer().required(),
        status: Joi.string().valid('approved', 'rejected').required(),
    });
    validate(schema, { id: req.params.id, status: req.body.status })
        .then(() => {
            next();
        })
        .catch(next);
};

export {
    createVideo,
    changePrivacy,
    shareVideoInChat,
    shareVideoByRepost,
    addView,
    getVideo,
    report,
    unreport,
    requiredIDParams,
    approvedVideo,
    deleteVideo,
    updateVideo,
};
