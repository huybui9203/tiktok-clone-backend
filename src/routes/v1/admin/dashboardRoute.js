import { Router } from 'express';
import * as dashboardController from '~/controllers/admin/dashboardController';
import authMiddleware from '~/middlewares/authMiddleware';
import checkPermission from '~/middlewares/checkPermission';
import * as conversationValidation from '~/validations/admin/conversationValidation';
const router = Router();

router
    .route('/analytics')
    .get(
        authMiddleware,
        checkPermission('analytics', ['super_admin', 'admin']),
        dashboardController.analytics
    );
router.get(
    '/users-monthly',
    authMiddleware,
    checkPermission('analytics', ['super_admin', 'admin']),
    dashboardController.userMonthlyStats
);

router.get(
    '/videos-monthly',
    authMiddleware,
    checkPermission('analytics', ['super_admin', 'admin']),
    dashboardController.videoMonthlyStats
);
export default router;
