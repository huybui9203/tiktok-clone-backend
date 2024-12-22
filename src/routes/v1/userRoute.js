import express from 'express';
import * as userController from '~/controllers/userController';
import * as userValidation from '~/validations/userValidation';
import uploadSingleFile from '~/middlewares/uploadSingleFile';
import authMiddleware from '~/middlewares/authMiddleware';
const router = express.Router();

router.get('/', userController.getAll);
// router.route('/:id')
// .post(userValidation.updateUser, userController.updateUser)

router.get('/:username', authMiddleware, userController.getProfileByUsername);
router.patch(
    '/:id',
    authMiddleware,
    uploadSingleFile,
    userValidation.updateProfile,
    userController.updateProfile
);
router.get(
    '/:username/check-valid',
    authMiddleware,
    userController.checkValidUsername
);
router.get(
    '/:id/video-favorite',
    authMiddleware,
    userController.getFavoriteVideos
);

export default router;
