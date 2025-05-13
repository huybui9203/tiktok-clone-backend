import { StatusCodes } from 'http-status-codes';
import * as notificationService from '~/services/notificationService';
import formatDate from '~/utils/formatDate';

const getNotifications = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { lastTime, lastId, type } = req.query;
        const perPage = 10;
        const dateTimeValue = formatDate(Number(lastTime));

        const { listNotifications, count, unreadCount } =
            await notificationService.getNotifications(
                dateTimeValue,
                lastId,
                currentUserId,
                type,
                perPage
            );

        res.status(StatusCodes.OK).json({
            data: listNotifications,
            meta: {
                pagination: {
                    total: count,
                    per_page: perPage,
                    page_count: listNotifications.length,
                    next_cursor:
                        listNotifications.length < perPage
                            ? null
                            : {
                                  last_time: new Date(
                                      listNotifications.at(-1)?.createdAt
                                  ).getTime(),
                                  last_id: listNotifications.at(-1)?.id,
                              },
                },
                unread_count: unreadCount,
            },
        });
    } catch (error) {
        next(error);
    }
};

const markAsReadOrUnRead = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id } = req.params;
        const { isRead } = req.body;
        const notificationId = Number(id);
        await notificationService.markAsReadOrUnRead(
            notificationId,
            currentUserId,
            isRead
        );
        res.status(StatusCodes.OK).json({
            message: 'Notification updated successfully',
            data: {
                id: notificationId,
                is_read: isRead,
            },
        });
    } catch (error) {
        next(error);
    }
};

const markAllAsRead = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        await notificationService.markAllAsRead(currentUserId);
        res.status(StatusCodes.OK).json({
            message: 'All notifications marked as read successfully',
        });
    } catch (error) {
        next(error);
    }
};

const deleteNotification = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id } = req.params;
        const notificationId = Number(id);
        await notificationService.deleteNotification(
            notificationId,
            currentUserId
        );
        res.status(StatusCodes.OK).json({
            message: 'Notification deleted successfully',
            data: {
                id: notificationId,
            },
        });
    } catch (error) {
        next(error);
    }
};

export {
    getNotifications,
    markAsReadOrUnRead,
    markAllAsRead,
    deleteNotification,
};
