import { Router } from 'express';
import * as reportController from '~/controllers/admin/reportController';
import authMiddleware from '~/middlewares/authMiddleware';
import checkPermission from '~/middlewares/checkPermission';
import * as reportValidation from '~/validations/admin/reportValidation';
const router = Router();

router
    .route('/')
    .get(
        authMiddleware,
        checkPermission('list:report', ['super_admin', 'admin']),
        reportController.getListReports
    );

router.get(
    '/:id',
    authMiddleware,
    checkPermission('read:report', ['super_admin', 'admin']),
    reportValidation.getReportDetail,
    reportController.getReportDetail
);

router.patch(
    '/:id',
    authMiddleware,
    checkPermission('edit:report', ['super_admin', 'admin']),
    reportValidation.handleReport,
    reportController.handleReport
);
export default router;
