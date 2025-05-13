import express from 'express';
import * as userController from '~/controllers/userController';
import * as userValidation from '~/validations/userValidation';
import uploadSingleFile from '~/middlewares/uploadSingleFile';
import authMiddleware from '~/middlewares/authMiddleware';
import checkPermission from '~/middlewares/checkPermission';
const router = express.Router();

router.get('/check-valid', authMiddleware, userController.checkValidUsername);

router.get(
    '/search',
    authMiddleware,
    checkPermission('list:user'),
    userValidation.searchUser,
    userController.searchUsers
);

router.get(
    '/suggested',
    authMiddleware,
    checkPermission('list:user'),
    userController.getListSuggested
);
router.get(
    '/me/followings',
    authMiddleware,
    checkPermission('list:user'),
    userController.getListFollowings
);

router.get(
    '/:username',
    authMiddleware,
    checkPermission('read:user'),
    userController.getProfileByUsername
);

router.patch(
    '/:id',
    authMiddleware,
    checkPermission('edit:user'),
    uploadSingleFile.onlyImage,
    userValidation.updateProfile,
    userController.updateProfile
);

router.get(
    '/:id/favorite-videos',
    authMiddleware,
    userController.getListFavoriteVideos
);

router.get('/:id/friends', authMiddleware, userController.getListFriends);
router.get('/:username/videos', authMiddleware, userController.getListVideos);
router.post('/:id/follow', authMiddleware, userController.followUser);
router.post('/:id/unfollow', authMiddleware, userController.unfollowUser);
router.get(
    '/:id/liked-videos',
    authMiddleware,
    userController.getListVideosLiked
);

router.get(
    '/:id/reposted-videos',
    authMiddleware,
    userController.getListVideosReposted
);

router.delete(
    '/:id',
    authMiddleware,
    checkPermission('delete:user'),
    userValidation.deleteUser,
    userController.deleteUser
);

export default router;
