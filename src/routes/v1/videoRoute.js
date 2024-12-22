import { Router } from 'express';
import * as commentValidation from '~/validations/commentValidation';
import * as commentController from '~/controllers/commentController';
import * as videoController from '~/controllers/videoController';
import authMiddleware from '~/middlewares/authMiddleware';
import uploadSingleFile from '~/middlewares/uploadSingleFile';
import * as videoValidation from '~/validations/videoValidation';

const router = Router();

router
    .route('/')
    .get(videoController.getListVideos)
    .post(
        authMiddleware,
        uploadSingleFile,
        videoValidation.createVideo,
        videoController.createNew
    );

router.post('/upload', videoController.uploadVideo);

router.route('/:uuid').get(videoController.getVideo);

router.post('/:uuid/covers', videoController.uploadVideoCover);

router
    .route('/:id/comments')
    .get(authMiddleware, commentController.getComments)
    .post(authMiddleware,commentController.createNew);

router.post('/remove-exist', videoController.removeExistFile);

export default router;
