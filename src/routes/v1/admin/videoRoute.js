import { Router } from 'express';
import * as videoController from '~/controllers/admin/videoController';
import authMiddleware from '~/middlewares/authMiddleware';
import checkPermission from '~/middlewares/checkPermission';
import * as videoValidation from '~/validations/videoValidation';
const router = Router();

router
    .route('/')
    .get(
        authMiddleware,
        checkPermission('list:video', ['super_admin', 'admin']),
        videoController.getListVideos
    );

router
    .route('/categories')
    .get(
        authMiddleware,
        checkPermission('list:categories', ['super_admin', 'admin']),
        videoController.getListCategories
    )
    .post(
        authMiddleware,
        checkPermission('create:categories', ['super_admin', 'admin']),
        videoController.createCategory
    );

router
    .route('/categories/:id')
    .patch(
        authMiddleware,
        checkPermission('edit:categories', ['super_admin', 'admin']),
        videoController.updateCategory
    )
    .delete(
        authMiddleware,
        checkPermission('delete:categories', ['super_admin', 'admin']),
        videoController.deleteCategory
    );

router.get(
    '/:id',
    authMiddleware,
    checkPermission('list:video', ['super_admin', 'admin']),
    videoValidation.requiredIDParams,
    videoController.getVideoDetail
);

router.patch(
    '/:id/approve',
    authMiddleware,
    checkPermission('approve:video'),
    videoValidation.approvedVideo,
    videoController.approvedVideo
);

export default router;
