import { Router } from 'express';
// import * as commentValidation from '~/validations/commentValidation';
import * as notificationController from '~/controllers/notificationController';
import * as notificationValidation from '~/validations/notificationValidation';
import authMiddleware, {
    authMiddlewareForVideoRoute,
} from '~/middlewares/authMiddleware';

const router = Router();

router
    .route('/')
    .get(
        authMiddleware,
        notificationValidation.getListByCursor,
        notificationController.getNotifications
    );
router.patch(
    '/:id/mark-as-read',
    authMiddleware,
    notificationValidation.markAsReadOrUnRead,
    notificationController.markAsReadOrUnRead
);

router.patch(
    '/:id/mark-as-unread',
    authMiddleware,
    notificationValidation.markAsReadOrUnRead,
    notificationController.markAsReadOrUnRead
);

router.patch(
    '/mark-all-as-read',
    authMiddleware,
    notificationController.markAllAsRead
);

router.delete(
    '/:id/delete',
    authMiddleware,
    notificationValidation.deleteNotification,
    notificationController.deleteNotification
);

export default router;
