import express from 'express';
const router = express.Router();
import * as commentController from '~/controllers/commentController';
import * as videoController from '~/controllers/videoController';
import * as commentValidation from '~/validations/commentValidation';
import * as videoValidation from '~/validations/videoValidation';
import authMiddleware from '~/middlewares/authMiddleware';
import checkPermission from '~/middlewares/checkPermission';

router
    .route('/:id')
    .patch(
        authMiddleware,
        commentValidation.updateComment,
        commentController.updateComment
    )
    .delete(authMiddleware, commentController.deleteComment);

router.post('/:id/like', authMiddleware, commentController.likeComment);
router.delete('/:id/unlike', authMiddleware, commentController.unlikeComment);

router.post(
    '/:id/report',
    authMiddleware,
    checkPermission('create:report'),
    videoValidation.report,
    videoController.report
);

router.delete(
    '/:id/unreport',
    authMiddleware,
    checkPermission('delete:report'),
    videoValidation.unreport,
    videoController.unreport
);

export default router;
