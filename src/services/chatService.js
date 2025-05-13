import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { Op, QueryTypes } from 'sequelize';
import db from '~/models';
import ApiError from '~/utils/ApiError';
import { destroy } from '~/utils/customSequelizeMethods';
import { destroyImage } from '~/utils/uploadFile';

const conversationType = {
    SELF: 'self',
    DIRECT: 'direct',
    GROUP: 'group',
};

const createAttachments = async (attachments) => {
    return await db.Attachment.bulkCreate(attachments);
};

const sendMessage = async ({
    senderId,
    receiverId,
    conversationId,
    type,
    replyToId,
    message,
    creatorId,
    attachments,
}) => {
    const t = await db.sequelize.transaction();
    try {
        let newMessage;
        //if send message and create new conversation
        if (!conversationId) {
            const conversation = await db.Conversation.create(
                {
                    creator_id: creatorId,
                    type,
                },
                { transaction: t }
            );

            const addParticipants = () => {
                //seft-chat
                if (type === conversationType.SELF) {
                    return db.Conversation_member.create(
                        {
                            conversation_id: conversation.id,
                            user_id: senderId,
                        },
                        { transaction: t }
                    );
                }
                return db.Conversation_member.bulkCreate(
                    [
                        {
                            conversation_id: conversation.id,
                            user_id: senderId,
                        },
                        ...receiverId.map((id) => ({
                            conversation_id: conversation.id,
                            user_id: id,
                        })),
                    ],
                    { transaction: t }
                );
            };

            const addMessage = () => {
                if (message && attachments) {
                    return db.Message.bulkCreate(
                        [
                            {
                                content: message,
                                sender_id: senderId,
                                reply_to_id: replyToId,
                                type: 'text',
                                conversation_id: conversation.id,
                            },
                            ...attachments.map((attachment) => ({
                                content: null,
                                sender_id: senderId,
                                reply_to_id: replyToId,
                                type: 'attachment',
                                conversation_id: conversation.id,
                            })),
                        ],
                        { transaction: t }
                    );
                } else if (message) {
                    return db.Message.create(
                        {
                            content: message,
                            sender_id: senderId,
                            reply_to_id: replyToId,
                            type: 'text',
                            conversation_id: conversation.id,
                        },
                        { transaction: t }
                    );
                } else if (attachments) {
                    return db.Message.bulkCreate(
                        attachments.map((attachment) => ({
                            content: null,
                            sender_id: senderId,
                            reply_to_id: replyToId,
                            type: 'attachment',
                            conversation_id: conversation.id,
                        })),
                        { transaction: t }
                    );
                }
            };

            const [messageResult] = await Promise.all([
                addMessage(),
                addParticipants(),
            ]);

            const lastMessageId = Array.isArray(messageResult)
                ? messageResult[messageResult.length - 1]?.id
                : messageResult.id;

            await db.Conversation.update(
                { last_msg_id: lastMessageId },
                { where: { id: conversation.id }, transaction: t }
            );
            newMessage = messageResult;
        } else {
            let lastMessageId;
            if (message && attachments) {
                newMessage = await db.Message.bulkCreate(
                    [
                        {
                            content: message,
                            sender_id: senderId,
                            reply_to_id: replyToId,
                            type: 'text',
                            conversation_id: conversationId,
                        },
                        ...attachments.map((attachment) => ({
                            content: null,
                            sender_id: senderId,
                            reply_to_id: replyToId,
                            type: 'attachment',
                            conversation_id: conversationId,
                        })),
                    ],
                    { transaction: t }
                );
                lastMessageId = newMessage[newMessage.length - 1]?.id;
            } else if (message) {
                newMessage = await db.Message.create(
                    {
                        content: message,
                        sender_id: senderId,
                        reply_to_id: replyToId,
                        type: 'text',
                        conversation_id: conversationId,
                    },
                    { transaction: t }
                );
                lastMessageId = newMessage.id;
            } else if (attachments) {
                newMessage = await db.Message.bulkCreate(
                    attachments.map((attachment) => ({
                        content: null,
                        sender_id: senderId,
                        reply_to_id: replyToId,
                        type: 'attachment',
                        conversation_id: conversationId,
                    })),
                    { transaction: t }
                );
                lastMessageId = newMessage[newMessage.length - 1]?.id;
            }
            await db.Conversation.update(
                { last_msg_id: lastMessageId },
                { where: { id: conversationId }, transaction: t }
            );
        }

        await t.commit();
        return newMessage;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

const unsendMessage = async (messageId, currentUserId) => {
    //check user has permission delete
    const message = await db.Message.findByPk(messageId);
    if (message?.sender_id !== currentUserId) {
        throw new ApiError(
            StatusCodes.FORBIDDEN,
            `You don't have permission to access this resource`
        );
    }

    if (message.type === 'attachment') {
        const attachment = await db.Attachment.findOne({
            where: {
                message_id: messageId,
            },
        });
        if (attachment) {
            const publicId = attachment.meta?.public_id;
            if (publicId) {
                await destroyImage(publicId);
            }
        }
    }

    await destroy(db.Message, {
        where: { id: messageId },
    });

    //remove reaction
    await db.Reaction.destroy({
        where: {
            reactable_id: messageId,
            reactable_type: 'message',
        },
    });

    //get last message of conversation
    const messages = await db.sequelize.query(
        `select message.id, user.nickname as sender_name, message.sender_id, message.type, 
        message.content, attachment.file_type as attachment,
        json_extract(message.shared_data, '$.post.type') as shared_type,
        (select JSON_OBJECT('id',Reactions.user_id,'nickname',Users.nickname, 'type',type) 
        from Reactions join Users on Reactions.user_id = Users.id 
        where Reactions.reactable_type = 'message' 
        and Reactions.reactable_id = message.id 
        order by Reactions.updatedAt desc, Reactions.id desc limit 1) as reaction_by,message.createdAt
        from (select * from Messages as msg where msg.conversation_id = ${message.conversation_id} 
        order by msg.createdAt desc, msg.id desc limit 1) message
        join Users as user on message.sender_id = user.id 
        left join Attachments as attachment on message.id = attachment.message_id`,
        {
            type: QueryTypes.SELECT,
        }
    );

    const lastMessage = messages[0];
    //update last message Id
    await db.Conversation.update(
        { last_msg_id: lastMessage?.id },
        { where: { id: message.conversation_id } }
    );

    if (!lastMessage) {
        return [null, message.conversation_id];
    }
    return [lastMessage, message.conversation_id];
};

const reactMessage = async (
    messageId,
    reactionType,
    reactionUser,
    currentUserId
) => {
    const message = await db.Message.findByPk(messageId);
    if (!message) {
        throw new ApiError(
            StatusCodes.NOT_FOUND,
            `This resource does'nt exist`
        );
    }
    const [reaction, created] = await db.Reaction.upsert({
        user_id: currentUserId,
        reactable_id: messageId,
        reactable_type: 'message',
        type: reactionType,
    });

    const reactions = await db.Reaction.findAll({
        attributes: [
            'type',
            [db.sequelize.fn('COUNT', db.sequelize.col('type')), 'count'],
        ],
        where: {
            reactable_type: 'message',
            reactable_id: messageId,
        },
        group: 'type',
    });

    const reactionStat = {
        loves_count: 0,
        laughs_count: 0,
        likes_count: 0,
        total: 0,
    };

    reactions.forEach((item) => {
        const reaction = item.toJSON();
        if (reaction.type === 'love') {
            reactionStat.loves_count = reaction.count;
        } else if (reaction.type === 'haha') {
            reactionStat.laughs_count = reaction.count;
        } else if (reaction.type === 'like') {
            reactionStat.likes_count = reaction.count;
        }
        reactionStat.total += reaction.count;
    });

    return [
        created,
        {
            status: 'success',
            message_id: messageId,
            reaction_by: {
                id: currentUserId,
                type: reactionType,
                nickname: reactionUser,
            },
            reaction_stat: reactionStat,
        },
    ];
};

const removeReaction = async (messageId, currentUserId, reactionId) => {
    const reaction = await db.Reaction.findOne({
        where: { id: reactionId },
        attributes: ['id'],
    });
    if (!reaction) {
        throw new ApiError(
            StatusCodes.NOT_FOUND,
            `This resource does'nt exist`
        );
    }

    await destroy(db.Reaction, {
        where: {
            id: reaction.id,
            user_id: currentUserId,
        },
    });

    const reactions = await db.Reaction.findAll({
        attributes: [
            'type',
            [db.sequelize.fn('COUNT', db.sequelize.col('type')), 'count'],
        ],
        where: {
            reactable_type: 'message',
            reactable_id: messageId,
        },
        group: 'type',
    });

    const reactionStat = {
        loves_count: 0,
        laughs_count: 0,
        likes_count: 0,
        total: 0,
    };

    reactions.forEach((item) => {
        const reaction = item.toJSON();
        if (reaction.type === 'love') {
            reactionStat.loves_count = reaction.count;
        } else if (reaction.type === 'haha') {
            reactionStat.laughs_count = reaction.count;
        } else if (reaction.type === 'like') {
            reactionStat.likes_count = reaction.count;
        }
        reactionStat.total += reaction.count;
    });

    return reactionStat;
};

const getListReactions = async (
    lastTime,
    lastId,
    type,
    messageId,
    currentUserId,
    perPage
) => {
    const newLastId =
        lastId === undefined
            ? (await db.Reaction.max('id')) + 100000
            : Number(lastId);

    const reactionType = type === 'all' ? {} : { type };
    const [listReactions, count] = await Promise.all([
        db.Reaction.findAll({
            where: {
                [Op.and]: [
                    {
                        reactable_type: 'message',
                        reactable_id: messageId,
                        ...reactionType,
                    },
                    {
                        [Op.or]: [
                            db.sequelize.literal(
                                `Reaction.updatedAt < '${lastTime}'`
                            ),
                            db.sequelize.literal(
                                `(Reaction.updatedAt = '${lastTime}' and Reaction.id < ${newLastId})`
                            ),
                        ],
                    },
                ],
            },
            attributes: ['id', 'user_id', 'type', 'updatedAt'],
            include: [
                {
                    model: db.User,
                    as: 'reaction_by',
                    attributes: [
                        'nickname',
                        [
                            db.sequelize.literal(
                                `JSON_EXTRACT(avatar, '$.sm')`
                            ),
                            'avatar_url',
                        ],
                    ],
                },
            ],
            order: [
                [
                    db.sequelize.literal(
                        `CASE WHEN user_id = ${currentUserId} THEN 0 ELSE 1 END`
                    ),
                    'ASC',
                ],
                ['updatedAt', 'DESC'],
                ['id', 'DESC'],
            ],
            limit: perPage,
        }),
        db.Reaction.count({
            where: { reactable_type: 'message', reactable_id: messageId },
        }),
    ]);

    return { listReactions, count };
};

const getMessage = async (id) => {
    const message = await db.Message.findByPk(id, {
        attributes: {
            exclude: ['updatedAt'],
        },
        include: [
            {
                model: db.Attachment,
                as: 'attachment',
                attributes: {
                    exclude: ['createdAt', 'updatedAt', 'message_id'],
                },
            },

            {
                model: db.User,
                as: 'sender',
                attributes: [
                    'id',
                    'nickname',
                    [
                        db.sequelize.literal(
                            `JSON_EXTRACT(sender.avatar, '$.sm')`
                        ),
                        'avatar_url',
                    ],
                ],
            },

            {
                model: db.Message,
                as: 'reply_to',
                attributes: ['id', 'type', 'content', 'shared_data'],
                include: [
                    {
                        model: db.Attachment,
                        as: 'attachment',
                        attributes: ['file_type', 'file_path'],
                    },
                    {
                        model: db.User,
                        as: 'sender',
                        attributes: ['id', 'nickname'],
                    },
                ],
            },
        ],
    });
    return message;
};

const getListMessageByIds = async (ids) => {
    const listMessages = await db.Message.findAll({
        where: {
            id: [...ids],
        },
        attributes: {
            exclude: ['updatedAt'],
        },
        include: [
            {
                model: db.Attachment,
                as: 'attachment',
                attributes: {
                    exclude: ['createdAt', 'updatedAt', 'message_id'],
                },
            },

            {
                model: db.User,
                as: 'sender',
                attributes: [
                    'id',
                    'nickname',
                    [
                        db.sequelize.literal(
                            `JSON_EXTRACT(sender.avatar, '$.sm')`
                        ),
                        'avatar_url',
                    ],
                ],
            },

            {
                model: db.Message,
                as: 'reply_to',
                attributes: ['id', 'type', 'content', 'shared_data'],
                include: [
                    {
                        model: db.Attachment,
                        as: 'attachment',
                        attributes: ['file_type', 'file_path'],
                    },
                    {
                        model: db.User,
                        as: 'sender',
                        attributes: ['id', 'nickname'],
                    },
                ],
            },
        ],
    });
    return listMessages;
};

const getListMessages = async (lastTime, lastId, conversationId, perPage) => {
    const subQueries = {
        reactionCount: {
            love: `(select count(*) from Reactions as r where r.reactable_type = 'message' and r.reactable_id = Message.id and r.type = 'love')`,
            laugh: `(select count(*) from Reactions as r where r.reactable_type = 'message' and r.reactable_id = Message.id and r.type = 'haha')`,
            like: `(select count(*) from Reactions as r where r.reactable_type = 'message' and r.reactable_id = Message.id and r.type = 'like')`,
        },
    };

    const newLastId =
        lastId === undefined
            ? (await db.Message.max('id')) + 100000
            : Number(lastId);
    const [listMessages, count] = await Promise.all([
        db.Message.findAll({
            where: {
                [Op.and]: [
                    { conversation_id: conversationId },
                    {
                        [Op.or]: [
                            db.sequelize.literal(
                                `Message.createdAt < '${lastTime}'`
                            ),
                            db.sequelize.literal(
                                `(Message.createdAt = '${lastTime}' and Message.id < ${newLastId})`
                            ),
                        ],
                    },
                ],
            },

            attributes: {
                exclude: ['updatedAt'],
                include: [
                    [
                        db.sequelize.literal(subQueries.reactionCount.love),
                        'loves_count',
                    ],
                    [
                        db.sequelize.literal(subQueries.reactionCount.laugh),
                        'laughs_count',
                    ],
                    [
                        db.sequelize.literal(subQueries.reactionCount.like),
                        'likes_count',
                    ],
                ],
            },
            include: [
                {
                    model: db.Attachment,
                    as: 'attachment',
                    attributes: {
                        exclude: ['createdAt', 'updatedAt', 'message_id'],
                    },
                },

                {
                    model: db.User,
                    as: 'sender',
                    attributes: [
                        'id',
                        'nickname',
                        [
                            db.sequelize.literal(
                                `JSON_EXTRACT(sender.avatar, '$.sm')`
                            ),
                            'avatar_url',
                        ],
                    ],
                },

                // {
                //     model: db.Reaction,
                //     as: 'reactions',
                //     attributes: {
                //         exclude: [
                //             'createdAt',
                //             'updatedAt',
                //             'reactable_type',
                //             'reactable_id',
                //             'user_id',
                //         ],
                //     },
                //     include: [
                //         {
                //             model: db.User,
                //             as: 'reaction_by',
                //             attributes: ['id', 'nickname'],
                //         },
                //     ],
                //     // limit: 2
                // },

                {
                    model: db.Message,
                    as: 'reply_to',
                    attributes: ['id', 'type', 'content', 'shared_data'],
                    include: [
                        {
                            model: db.Attachment,
                            as: 'attachment',
                            attributes: ['file_type', 'file_path'],
                        },
                        {
                            model: db.User,
                            as: 'sender',
                            attributes: ['id', 'nickname'],
                        },
                    ],
                },
            ],
            order: [
                ['createdAt', 'DESC'],
                ['id', 'DESC'],
            ],
            limit: perPage,
        }),

        db.Message.count({
            where: {
                conversation_id: conversationId,
            },
        }),
    ]);
    return {
        listMessages: listMessages.map((message) => {
            const messageData = { ...message.toJSON() };
            const reaction_stat = {
                loves_count: messageData.loves_count,
                laughs_count: messageData.laughs_count,
                likes_count: messageData.likes_count,
                total:
                    messageData.loves_count +
                    messageData.laughs_count +
                    messageData.likes_count,
            };
            delete messageData.loves_count;
            delete messageData.laughs_count;
            delete messageData.likes_count;
            return {
                ...messageData,
                reaction_stat,
            };
        }),
        count,
    };
};

const getConversationNameAndMemberCount = async (
    currentUserId,
    conversationId
) => {
    const LIMIT_NAMES_COUNT = 6;
    const conversationData = await db.Conversation.findByPk(conversationId, {
        attributes: [
            [
                db.sequelize.literal(`
                        CASE
                            when Conversation.name is null and 
                            (select count(*) from Conversation_members as cm where cm.conversation_id = Conversation.id) = 1
                            then (select us.nickname from Conversation_members as cm join Users as us on 
                            cm.user_id = us.id where cm.conversation_id = Conversation.id 
                            and cm.user_id = ${currentUserId})

                            when Conversation.name is null then (select group_concat(sub.nickname separator ', ') 
                            from (select us.nickname from Conversation_members as cm join Users as us on 
                            cm.user_id = us.id where cm.conversation_id = Conversation.id 
                            and cm.user_id != ${currentUserId} limit ${LIMIT_NAMES_COUNT}) as sub) 

                            else Conversation.name
                        END
                    `),
                'name',
            ],
            [
                db.sequelize.literal(`
                    CASE
                        when Conversation.avatar is null and 
                        (select count(*) from Conversation_members as cm where cm.conversation_id = Conversation.id) = 1 
                        then (select group_concat(COALESCE(json_extract(sub.avatar, '$.sm'), '') separator ' ') 
                        from (select us.avatar from Conversation_members as cm join Users as us on cm.user_id = us.id 
                        where cm.conversation_id = Conversation.id and cm.user_id = ${currentUserId}) as sub) 

                        when Conversation.avatar is null then (select group_concat(COALESCE(json_extract(sub.avatar, '$.sm'), '') separator ' ') 
                        from (select us.avatar from Conversation_members as cm join Users as us on cm.user_id = us.id 
                        where cm.conversation_id = Conversation.id and cm.user_id != ${currentUserId} limit 2) as sub) 
                        
                        else json_extract(Conversation.avatar, '$.url')
                    END
                `),
                'avatar',
            ],
            [
                db.sequelize.literal(`
                        (select count(*) from Conversation_members as cm
                        where cm.conversation_id = Conversation.id)   
                    `),
                'members_count',
            ],
        ],
    });

    const conversation = conversationData.toJSON();
    const { name, members_count, avatar } = conversation;

    const groupAvatar = avatar.split(' ').map((url) => url.replace(/\"/g, ''));

    return {
        name: members_count > LIMIT_NAMES_COUNT ? `${name}, others` : name,
        avatar: groupAvatar,
        members_count,
    };
};

const getListConversations = async (currentUserId, page, perPage) => {
    const LIMIT_NAMES_COUNT = 6;
    const queries = {
        getLastViewedAt: `(select cm.last_viewed_at from Conversation_members as cm
                            where cm.user_id = ${currentUserId || -1} and 
                            cm.conversation_id = Conversation.id)`,
    };
    const getListConversations = () => {
        return db.Conversation.findAll({
            attributes: [
                'id',
                'name',
                'creator_id',
                'type',
                'createdAt',
                [
                    db.sequelize.literal(
                        `json_extract(Conversation.avatar, '$.public_id')`
                    ),
                    'public_avt_id',
                ],
                [
                    db.sequelize.literal(`
                        CASE
                            when Conversation.name is null and 
                            (select count(*) from Conversation_members as cm where cm.conversation_id = Conversation.id) = 1
                            then (select us.nickname from Conversation_members as cm join Users as us on 
                            cm.user_id = us.id where cm.conversation_id = Conversation.id 
                            and cm.user_id = ${currentUserId})

                            when Conversation.name is null then (select group_concat(sub.nickname separator ', ') 
                            from (select us.nickname from Conversation_members as cm join Users as us on 
                            cm.user_id = us.id where cm.conversation_id = Conversation.id 
                            and cm.user_id != ${currentUserId} limit ${LIMIT_NAMES_COUNT}) as sub) 

                            else Conversation.name
                        END
                    `),
                    'default_name',
                ],
                [
                    db.sequelize.literal(`
                        CASE
                            when Conversation.avatar is null and 
                            (select count(*) from Conversation_members as cm where cm.conversation_id = Conversation.id) = 1 
                            then (select group_concat(COALESCE(json_extract(sub.avatar, '$.sm'), '') separator ' ') 
                            from (select us.avatar from Conversation_members as cm join Users as us on cm.user_id = us.id 
                            where cm.conversation_id = Conversation.id and cm.user_id = ${currentUserId}) as sub) 

                            when Conversation.avatar is null then (select group_concat(COALESCE(json_extract(sub.avatar, '$.sm'), '') separator ' ') 
                            from (select us.avatar from Conversation_members as cm join Users as us on cm.user_id = us.id 
                            where cm.conversation_id = Conversation.id and cm.user_id != ${currentUserId} limit 2) as sub) 
                            
                            else json_extract(Conversation.avatar, '$.url')
                        END
                    `),
                    'avatar',
                ],
                [
                    db.sequelize.literal(`
                        (select count(*) from Conversation_members as cm
                        where cm.conversation_id = Conversation.id)   
                    `),
                    'members_count',
                ],
                [
                    db.sequelize.literal(queries.getLastViewedAt),
                    'last_viewed_at',
                ],
            ],
            include: [
                {
                    model: db.Message,
                    as: 'last_message',
                    attributes: [
                        'id',
                        'sender_id',
                        'content',
                        'createdAt',
                        'type',
                        [
                            db.sequelize.literal(`
                                JSON_EXTRACT(last_message.shared_data, '$.post.type')
                           `),
                            'shared_type',
                        ],
                        [
                            db.sequelize.literal(`
                                (select JSON_OBJECT('id',user_id,'nickname',Users.nickname, 'type',type) from Reactions join Users on Reactions.user_id = Users.id where Reactions.reactable_type = 'message' and Reactions.reactable_id = last_message.id order by Reactions.updatedAt desc, Reactions.id desc limit 1)
                           `),
                            'reaction_by',
                        ],
                    ],
                    include: [
                        {
                            model: db.User,
                            as: 'sender',
                            attributes: ['id', 'nickname'],
                        },

                        {
                            model: db.Attachment,
                            as: 'attachment',
                            attributes: ['id', 'file_type'],
                        },
                    ],
                },
            ],
            where: {
                id: {
                    [Op.in]: db.sequelize.literal(
                        `(select conversation_id from Conversation_members where user_id = ${currentUserId || -1})`
                    ),
                },
            },
            order: [
                [
                    { model: db.Message, as: 'last_message' },
                    'createdAt',
                    'DESC',
                ],
            ],
            limit: perPage,
            offset: perPage * (page - 1),
        });
    };
    const getConversationCount = () =>
        db.Conversation_member.count({
            where: {
                user_id: { [Op.eq]: currentUserId || -1 },
            },
        });

    const [listConversations, conversationCount] = await Promise.all([
        getListConversations(),
        getConversationCount(),
    ]);
    return [
        listConversations.map((item) => {
            const conversation = item.toJSON();
            const {
                id,
                name,
                default_name,
                creator_id,
                avatar,
                type,
                createdAt,
                public_avt_id,
                last_message,
                members_count,
                last_viewed_at,
            } = conversation;
            const groupAvatar = avatar
                .split(' ')
                .map((url) => url.replace(/\"/g, ''));

            return {
                id,
                creator_id,
                name,
                default_name:
                    members_count > LIMIT_NAMES_COUNT
                        ? `${default_name}, others`
                        : default_name,
                avatar: groupAvatar,
                type,
                members_count,
                createdAt,
                public_avt_id,
                is_viewed:
                    last_message === null ||
                    new Date(last_viewed_at) >=
                        new Date(last_message?.createdAt),
                last_viewed_at,
                last_message: last_message
                    ? {
                          id: last_message.id, //important (use to compare coming message and update last message of the current conversation)
                          sender_name: last_message.sender?.nickname,
                          sender_id: last_message.sender_id,
                          type: last_message.type,
                          content: last_message.content,
                          attachment: last_message.attachment?.file_type,
                          reaction_by: last_message.reaction_by,
                          shared_type: last_message.shared_type,
                          createdAt: last_message.createdAt,
                      }
                    : null,
            };
        }),
        conversationCount,
    ];
};

const checkPrivateConversation = async (currentUserId, userId) => {
    //self-chat
    if (userId === currentUserId) {
        const member = await db.Conversation_member.findOne({
            where: {
                user_id: currentUserId,
            },
            include: [
                {
                    model: db.Conversation,
                    as: 'conversation',
                    where: { type: conversationType.SELF },
                },
            ],
        });
        return member && { conversation_id: member.toJSON().conversation_id };
    }
    const conversation = await db.Conversation_member.findOne({
        where: {
            conversation_id: {
                [Op.in]: db.sequelize.literal(`(
                select c.conversation_id 
                from Conversation_members as c 
                where c.user_id in (${currentUserId},${userId})
                group by c.conversation_id 
                having count(c.user_id) = 2)`),
            },
        },
        attributes: ['conversation_id'],
        group: 'conversation_id',
        having: db.sequelize.where(
            db.sequelize.fn('count', db.sequelize.col('user_id')),
            2
        ),
    });
    return conversation;
};

//TODO: missing is_viewed cause 'updateLastView' when search
const searchConversation = async (currentUserId, page, perPage, searchStr) => {
    const LIMIT_NAMES_COUNT = 3;
    const getListConversations = () => {
        return db.Conversation.findAll({
            attributes: [
                'id',
                'name',
                'creator_id',
                'type',
                [
                    db.sequelize.literal(`json_extract(avatar, '$.public_id')`),
                    'public_avt_id',
                ],
                [
                    db.sequelize.literal(`
                        CASE
                            when Conversation.name is null and 
                            (select count(*) from Conversation_members as cm where cm.conversation_id = Conversation.id) = 1
                            then (select us.nickname from Conversation_members as cm join Users as us on 
                            cm.user_id = us.id where cm.conversation_id = Conversation.id 
                            and cm.user_id = ${currentUserId})

                            when Conversation.name is null then (select group_concat(sub.nickname separator ', ') 
                            from (select us.nickname from Conversation_members as cm join Users as us on 
                            cm.user_id = us.id where cm.conversation_id = Conversation.id 
                            and cm.user_id != ${currentUserId} limit ${LIMIT_NAMES_COUNT}) as sub) 
                            else Conversation.name
                        END
                    `),
                    'default_name',
                ],
                [
                    db.sequelize.literal(`
                        CASE
                            when Conversation.avatar is null and 
                            (select count(*) from Conversation_members as cm where cm.conversation_id = Conversation.id) = 1 
                            then (select group_concat(COALESCE(json_extract(sub.avatar, '$.sm'), '') separator ' ') 
                            from (select us.avatar from Conversation_members as cm join Users as us on cm.user_id = us.id 
                            where cm.conversation_id = Conversation.id and cm.user_id = ${currentUserId}) as sub) 

                            when Conversation.avatar is null then (select group_concat(COALESCE(json_extract(sub.avatar, '$.sm'), '') separator ' ') 
                            from (select us.avatar from Conversation_members as cm join Users as us on cm.user_id = us.id 
                            where cm.conversation_id = Conversation.id and cm.user_id != ${currentUserId} limit 2) as sub) 
                            else json_extract(Conversation.avatar, '$.url')
                        END
                    `),
                    'avatar',
                ],
                [
                    db.sequelize.literal(`
                        (select count(*) from Conversation_members as cm
                        where cm.conversation_id = Conversation.id)
                    `),
                    'members_count',
                ],
            ],
            where: {
                id: {
                    [Op.in]: db.sequelize.literal(
                        `(select conversation_id from Conversation_members where user_id = ${currentUserId || -1})`
                    ),
                },
            },
            order: [['last_msg_id', 'DESC']],
            limit: perPage,
            offset: perPage * (page - 1),
            having: db.sequelize.literal(
                `Conversation.name like '%${searchStr}%' or default_name like '%${searchStr}%'`
            ),
        });
    };

    const queries = {
        count: `select count(*) as count from 
                    (select c.id, c.name, 
                        case
                            when c.name is null then (select group_concat(sub.nickname separator ', ') 
                                from (select us.nickname from Conversation_members as cm join Users as us on 
                                cm.user_id = us.id where cm.conversation_id = c.id 
                                and cm.user_id != ${currentUserId} limit ${LIMIT_NAMES_COUNT}) as sub) 
                            else c.name
                        end as default_name
                        from Conversations as c
                        having c.name like '%${searchStr}%' or default_name like '%${searchStr}%'
                    ) sub`,
    };
    const getConversationCount = () =>
        db.sequelize.query(queries.count, {
            type: QueryTypes.SELECT,
        });

    const [listConversations, [{ count: conversationCount }]] =
        await Promise.all([getListConversations(), getConversationCount()]);
    return [
        listConversations.map((item) => {
            const conversation = item.toJSON();
            const {
                id,
                creator_id,
                name,
                type,
                public_avt_id,
                default_name,
                avatar,
                members_count,
            } = conversation;
            const groupAvatar = avatar
                .split(' ')
                .map((url) => url.replace(/\"/g, ''));
            let defaultName;
            if (members_count <= LIMIT_NAMES_COUNT) {
                defaultName = default_name;
            } else {
                defaultName = `${default_name}, and ${members_count - LIMIT_NAMES_COUNT} others`;
            }
            return {
                id,
                name,
                type,
                creator_id,
                members_count,
                public_avt_id,
                default_name: defaultName,
                avatar: groupAvatar,
            };
        }),
        conversationCount,
    ];
};

const getListAttachmentsOfConversation = async (
    lastTime,
    lastId,
    conversationId,
    perPage
) => {
    const newLastId =
        lastId === undefined
            ? (await db.Attachment.max('id')) + 100000
            : Number(lastId);
    const [listAttachments, count] = await Promise.all([
        db.Attachment.findAll({
            where: {
                [Op.or]: [
                    db.sequelize.literal(`message.createdAt < '${lastTime}'`),
                    db.sequelize.literal(
                        `(message.createdAt = '${lastTime}' and Attachment.id < ${newLastId})`
                    ),
                ],
            },
            attributes: {
                exclude: ['createdAt', 'updatedAt', 'message_id'],
            },

            include: [
                {
                    model: db.Message,
                    as: 'message',
                    attributes: ['createdAt'],
                    where: {
                        conversation_id: conversationId,
                    },
                },
            ],

            limit: perPage,
            order: [
                [{ model: db.Message, as: 'message' }, 'createdAt', 'DESC'],
                ['id', 'DESC'],
            ],
        }),

        db.Attachment.count({
            include: [
                {
                    model: db.Message,
                    as: 'message',
                    attributes: [],
                    where: {
                        conversation_id: conversationId,
                    },
                },
            ],
        }),
    ]);

    return { listAttachments, count };
};

const getListMemberOfConversation = async (
    lastTime,
    lastId,
    conversationId,
    perPage
) => {
    const newLastId =
        lastId === undefined
            ? (await db.Attachment.max('id')) + 100000
            : Number(lastId);
    const [listMembers, count] = await Promise.all([
        db.Conversation_member.findAll({
            where: {
                [Op.and]: [
                    { conversation_id: conversationId },
                    {
                        [Op.or]: [
                            db.sequelize.literal(
                                `Conversation_member.createdAt < '${lastTime}'`
                            ),
                            db.sequelize.literal(
                                `(Conversation_member.createdAt = '${lastTime}' and Conversation_member.id < ${newLastId})`
                            ),
                        ],
                    },
                ],
            },
            attributes: {
                exclude: ['updatedAt'],
                include: [
                    'id',
                    'createdAt',
                    [
                        db.sequelize.literal(
                            "CASE WHEN Conversation_member.user_id = conversation.creator_id THEN 'creator' ELSE 'member' END"
                        ),
                        'role',
                    ],
                ],
            },

            include: [
                {
                    model: db.Conversation,
                    as: 'conversation',
                    attributes: [],
                },

                {
                    model: db.User,
                    as: 'user',
                    attributes: [
                        'nickname',
                        'username',
                        [
                            db.sequelize.literal(
                                `JSON_EXTRACT(user.avatar, '$.sm')`
                            ),
                            'avatar_url',
                        ],
                    ],
                },
            ],

            order: [
                [
                    db.sequelize.literal(
                        `CASE WHEN Conversation_member.user_id = conversation.creator_id THEN 0 ELSE 1 END`
                    ),
                    'ASC',
                ],
                ['createdAt', 'DESC'],
                ['id', 'DESC'],
            ],
            limit: perPage,
        }),

        db.Conversation_member.count({
            where: {
                conversation_id: conversationId,
            },
        }),
    ]);

    return { listMembers, count };
};

const updateLastViewedChat = async (
    memberId,
    conversationId,
    lastViewedAt,
    status
) => {
    const queries = {
        getUnreadMessageCount: `select count(msg.id) as count from Conversation_members as cm 
                                join Messages as msg on cm.conversation_id = msg.conversation_id
                                where cm.user_id = ${memberId} and cm.conversation_id = ${conversationId}
                                and msg.sender_id != ${memberId}
                                and (msg.createdAt > cm.last_viewed_at or cm.last_viewed_at is null)`,
    };
    let unreadMessageCount;
    //when join conversation
    if (status === 'joined') {
        unreadMessageCount = await db.sequelize.query(
            queries.getUnreadMessageCount,
            {
                type: QueryTypes.SELECT,
                nest: true,
            }
        );
    }

    await db.Conversation_member.update(
        { last_viewed_at: lastViewedAt },
        {
            where: {
                user_id: memberId,
                conversation_id: conversationId,
            },
            silent: true,
        }
    );

    if (status === 'joined') {
        return unreadMessageCount[0]?.count || 0;
    }
    return;
};

const bulkUpdateLastView = async (userId, conversationIds) => {
    await db.Conversation_member.update(
        { last_viewed_at: new Date() },
        {
            where: {
                user_id: userId,
                conversation_id: conversationIds,
            },
            silent: true,
        }
    );
};

const getUnreadMessageCount = async (currentUserId) => {
    const queries = {
        getUnreadMessage: `select count(msg.id) as count from Conversation_members as cm 
                            join Messages as msg on cm.conversation_id = msg.conversation_id
                            where user_id = ${currentUserId || -1} and msg.sender_id != ${currentUserId}
                            and (msg.updatedAt > cm.last_viewed_at or cm.last_viewed_at is null)`,
    };

    const unreadMessageCount = await db.sequelize.query(
        queries.getUnreadMessage,
        {
            type: QueryTypes.SELECT,
            nest: true,
        }
    );

    return unreadMessageCount;
};

const getMember = async (currentUserId, conversationId) => {
    //Only for conversations with 2 members
    const queries = {
        isFriend: `exists (select 1 from Follows as f1 join Follows as f2 
                    on f1.follower_id = f2.following_id and f1.following_id = f2.follower_id
                    and f1.follower_id = ${currentUserId || -1} and f1.following_id = Conversation_member.user_id)`,
    };
    const member = await db.Conversation_member.findOne({
        where: {
            conversation_id: conversationId,
            user_id: {
                [Op.ne]: currentUserId,
            },
        },
        include: [
            {
                model: db.User,
                as: 'user',
                attributes: ['id', 'username'],
            },
        ],
        attributes: [
            'id',
            'conversation_id',
            'user_id',
            [db.sequelize.literal(queries.isFriend), 'is_friend'],
        ],
    });

    if (!member) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Member not found');
    }
    const jsonData = member.toJSON();
    return {
        ...jsonData,
        is_friend: !!jsonData.is_friend,
    };
};

const customizeConversation = async (conversationId, data, type) => {
    if (type === 'name_avt') {
        await db.Conversation.update(data, {
            where: {
                id: conversationId,
            },
        });
    }
};

const getSuggestedUsers = async (
    conversationId,
    currentUserId,
    searchStr,
    page,
    perPage
) => {
    const queries = {
        isFriend: `exists (select 1 from Follows as f1 join Follows as f2
                    on f1.follower_id = f2.following_id and f1.following_id = f2.follower_id 
                    where f1.follower_id = ${currentUserId || -1} and f1.following_id = User.id)`,
        isNotMember: `not exists (select 1 from Conversation_members as cm where cm.user_id = User.id
                    and cm.conversation_id = ${conversationId})`,
    };
    const { rows: listSuggested, count } = await db.User.findAndCountAll({
        where: {
            [Op.and]: [
                { nickname: { [Op.substring]: searchStr } },
                db.sequelize.literal(queries.isNotMember),
            ],
        },
        attributes: [
            'id',
            'nickname',
            [
                db.sequelize.literal(`json_extract(avatar, '$.sm')`),
                'avatar_url',
            ],
            [db.sequelize.literal(queries.isFriend), 'is_friend'],
        ],
        order: [['is_friend', 'DESC']],
        offset: perPage * (page - 1),
        limit: perPage,
    });
    return { listSuggested, count };
};

const addMembers = async (conversationId, currentUserId, memberIds) => {
    const hasPermission = await db.Conversation.findOne({
        id: conversationId,
        creator_id: currentUserId,
    });
    if (!hasPermission) {
        throw new ApiError(
            StatusCodes.FORBIDDEN,
            `You don't have permission to change resource`
        );
    }
    await db.Conversation_member.bulkCreate(
        memberIds.map((userId) => ({
            user_id: userId,
            conversation_id: conversationId,
            last_viewed_at: new Date(),
        }))
    );
};

const leaveConversation = async (conversationId, currentUserId, memberIds) => {
    if (memberIds.length === 1 && memberIds[0] === currentUserId) {
        await db.Conversation_member.destroy({
            where: {
                user_id: currentUserId,
                conversation_id: conversationId,
            },
        });
        return;
    }
    const hasPermission = await db.Conversation.findOne({
        id: conversationId,
        creator_id: currentUserId,
    });
    if (!hasPermission) {
        throw new ApiError(
            StatusCodes.FORBIDDEN,
            `You don't have permission to change resource`
        );
    }
    await db.Conversation_member.destroy({
        where: {
            user_id: memberIds,
            conversation_id: conversationId,
        },
    });
};
export {
    createAttachments,
    sendMessage,
    unsendMessage,
    reactMessage,
    removeReaction,
    getListReactions,
    getListConversations,
    getListMessages,
    getMessage,
    getListMemberOfConversation,
    checkPrivateConversation,
    searchConversation,
    getListAttachmentsOfConversation,
    getListMessageByIds,
    updateLastViewedChat,
    getUnreadMessageCount,
    getMember,
    bulkUpdateLastView,
    customizeConversation,
    getSuggestedUsers,
    addMembers,
    leaveConversation,
    getConversationNameAndMemberCount,
};
