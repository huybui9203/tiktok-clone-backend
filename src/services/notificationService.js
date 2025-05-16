import { StatusCodes } from 'http-status-codes';
import { Op } from 'sequelize';
import db from '~/models';
import ApiError from '~/utils/ApiError';
import { destroy } from '~/utils/customSequelizeMethods';

const bulkCreateSubject = async (subjects) => {
    return await Promise.all(
        subjects.map((subject) => db.Subject.upsert(subject))
    );
};

const createSubject = async (subject) => {
    return await db.Subject.upsert(subject);
};

const updateSubject = async (objectData, objectId, objectType) => {
    return await db.Subject.update(objectData, {
        where: {
            object_id: objectId,
            type: objectType,
        },
    });
};
const createNotification = async (notificationData, subjectId) => {
    const t = await db.sequelize.transaction();
    try {
        const [notificationInstance, created] = await db.Notification.upsert(
            notificationData,
            { transaction: t }
        );
        const [subject, createdSubject] =
            await db.Notification_subjects.findOrCreate({
                where: {
                    notification_id: notificationInstance.id,
                    subject_id: subjectId,
                },
                transaction: t,
            });
        if (!created && createdSubject) {
            await db.Notification.increment(
                {
                    subject_count: 1,
                },
                { where: { id: notificationInstance.id }, transaction: t }
            );
        }
        await t.commit();
        return notificationInstance.id;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

const removeNotification = async (sourceId, uniqueKey) => {
    const subject = await db.Subject.findOne({
        where: {
            object_id: sourceId,
            type: 'user',
        },
    });
    const notification = await db.Notification.findOne({
        where: {
            unique_key: uniqueKey,
        },
    });
    if (!subject || !notification) {
        return null;
    }
    const t = await db.sequelize.transaction();
    try {
        await destroy(db.Notification_subjects, {
            where: {
                notification_id: notification.id,
                subject_id: subject.id,
            },
            transaction: t,
        });

        await db.Notification.decrement(
            {
                subject_count: 1,
            },
            { where: { id: notification.id }, transaction: t }
        );

        await t.commit();
    } catch (error) {
        await t.rollback();
        throw error;
    }
    await db.Notification.destroy({
        where: { subject_count: { [Op.lte]: 0 } },
    });
};

const getNotifications = async (lastTime, lastId, userId, type, perPage) => {
    const newLastId =
        lastId === undefined
            ? (await db.Reaction.max('id')) + 100000
            : Number(lastId);

    const typeOption = {};
    if (type === 'all') {
    } else if (type === 'unread') {
        typeOption.is_read = false;
    } else {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid type');
    }
    const [listNotifications, count, unreadCount] = await Promise.all([
        db.Notification.findAll({
            where: {
                [Op.and]: [
                    {
                        user_id: userId,
                        subject_count: { [Op.gt]: 0 },
                        ...typeOption,
                    },
                    {
                        [Op.or]: [
                            db.sequelize.literal(
                                `Notification.updatedAt < '${lastTime}'`
                            ),
                            db.sequelize.literal(
                                `(Notification.updatedAt = '${lastTime}' and Notification.id < ${newLastId})`
                            ),
                        ],
                    },
                ],
            },
            attributes: [
                'id',
                'subject_count',
                'type',
                'is_read',
                'createdAt',
                'updatedAt',
            ],
            include: [
                {
                    model: db.Notification_subjects,
                    as: 'subjects',
                    attributes: ['id'],
                    include: [
                        {
                            model: db.Subject,
                            as: 'subject',
                            attributes: {
                                exclude: ['createdAt', 'updatedAt'],
                            },
                        },
                    ],
                    separate: true,
                    order: [['createdAt', 'DESC']],
                },

                {
                    model: db.Subject,
                    as: 'direct_object',
                    attributes: {
                        exclude: ['createdAt', 'updatedAt'],
                    },
                },

                {
                    model: db.Subject,
                    as: 'indirect_object',
                    attributes: {
                        exclude: ['createdAt', 'updatedAt'],
                    },
                },

                {
                    model: db.Subject,
                    as: 'prep_object',
                    attributes: {
                        exclude: ['createdAt', 'updatedAt'],
                    },
                },
            ],
            order: [
                // [
                //     db.sequelize.literal(
                //         `CASE WHEN Notification.is_read = false THEN 0 ELSE 1 END`
                //     ),
                //     'ASC',
                // ],
                ['updatedAt', 'DESC'],
                ['id', 'DESC'],
            ],
            limit: perPage,
        }),

        db.Notification.count({
            where: {
                user_id: userId,
                subject_count: { [Op.gt]: 0 },
                ...typeOption,
            },
        }),

        db.Notification.count({
            where: {
                user_id: userId,
                subject_count: { [Op.gt]: 0 },
                is_read: false,
            },
        }),
    ]);
    return {
        listNotifications: listNotifications.map((notification) => {
            const jsonData = notification.toJSON();
            return {
                ...jsonData,
                subjects: jsonData.subjects?.map((subject) => subject.subject),
            };
        }),
        count,
        unreadCount,
    };
};

const getNotification = async (id) => {
    const notification = await db.Notification.findByPk(id, {
        attributes: [
            'id',
            'subject_count',
            'type',
            'is_read',
            'createdAt',
            'updatedAt',
        ],
        include: [
            {
                model: db.Notification_subjects,
                as: 'subjects',
                attributes: ['id'],
                include: [
                    {
                        model: db.Subject,
                        as: 'subject',
                        attributes: [
                            'id',
                            'object_id',
                            'name',
                            'type',
                            'image_url',
                            'image_url',
                            'uuid',
                        ],
                    },
                ],
            },

            {
                model: db.Subject,
                as: 'direct_object',
                attributes: [
                    'id',
                    'object_id',
                    'name',
                    'type',
                    'image_url',
                    'image_url',
                    'uuid',
                ],
            },

            {
                model: db.Subject,
                as: 'indirect_object',
                attributes: [
                    'id',
                    'object_id',
                    'name',
                    'type',
                    'image_url',
                    'image_url',
                    'uuid',
                ],
            },

            {
                model: db.Subject,
                as: 'prep_object',
                attributes: [
                    'id',
                    'object_id',
                    'name',
                    'type',
                    'image_url',
                    'image_url',
                    'uuid',
                ],
            },
        ],
    });
    const jsonData = notification.toJSON();
    return {
        ...jsonData,
        subjects: jsonData.subjects?.map((subject) => subject.subject),
    };
};

const markAsReadOrUnRead = async (notificationId, userId, isRead) => {
    await db.Notification.update(
        { is_read: isRead },
        {
            where: {
                id: notificationId,
                user_id: userId,
            },
            silent: true,
        }
    );
};

const markAllAsRead = async (userId) => {
    await db.Notification.update(
        { is_read: true },
        {
            where: {
                user_id: userId,
            },
            silent: true,
        }
    );
};

const deleteNotification = async (notificationId, userId) => {
    await destroy(db.Notification, {
        where: {
            id: notificationId,
            user_id: userId,
        },
    });
};
export {
    bulkCreateSubject,
    createSubject,
    updateSubject,
    createNotification,
    removeNotification,
    getNotifications,
    markAsReadOrUnRead,
    markAllAsRead,
    deleteNotification,
};
