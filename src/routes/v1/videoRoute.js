import { Router } from 'express';
import * as commentValidation from '~/validations/commentValidation';
import * as commentController from '~/controllers/commentController';
import * as videoController from '~/controllers/videoController';
import * as videoValidation from '~/validations/videoValidation';
import authMiddleware, {
    authMiddlewareForVideoRoute,
} from '~/middlewares/authMiddleware';
import uploadSingleFile from '~/middlewares/uploadSingleFile';
import checkPermission from '~/middlewares/checkPermission';

const router = Router();

router
    .route('/')
    .get(authMiddlewareForVideoRoute, videoController.getListVideos)
    .post(
        authMiddleware,
        uploadSingleFile.onlyImage,
        videoValidation.createVideo,
        videoController.createNew
    );

router.post('/upload', videoController.uploadVideo);
// router.post('/discard', videoController.uploadVideo);

router.get('/categories', authMiddleware, videoController.getVideoCategories);

router.get(
    '/followings',
    authMiddleware,
    videoController.getFollowingsWithNewestVideos
);
router.get(
    '/friends',
    authMiddleware,
    videoController.getFriendsWithNewestVideos
);

router.get('/me', authMiddleware, videoController.getMyListVideos);

router
    .route('/:uuid')
    .get(
        authMiddlewareForVideoRoute,
        videoValidation.getVideo,
        videoController.getVideo
    );

router
    .route('/:id/comments')
    .get(authMiddleware, commentController.getComments)
    .post(
        authMiddleware,
        commentValidation.createComment,
        commentController.createComment
    );

router.post('/remove-exist', videoController.removeExistFile);
router.post('/:id/like', authMiddleware, videoController.likeVideo);
router.post('/:id/unlike', authMiddleware, videoController.unlikeVideo);
router.post(
    '/:id/add-to-favorite',
    authMiddleware,
    videoController.addVideoToFavorite
);
router.post(
    '/:id/remove-from-favorite',
    authMiddleware,
    videoController.removeVideoFromFavorite
);
router.post(
    '/:id/share-chat',
    authMiddleware,
    videoValidation.shareVideoInChat,
    videoController.shareVideoInChat
);

router.post(
    '/:id/share-friends',
    authMiddleware,
    videoValidation.shareVideoInChat,
    videoController.shareVideoToFriends
);

router.post(
    '/:id/share-repost',
    authMiddleware,
    videoValidation.shareVideoByRepost,
    videoController.shareVideoByRepost
);
router.post(
    '/:id/views',
    authMiddleware,
    videoValidation.addView,
    videoController.addView
);

router.delete(
    '/:id/remove-reposted',
    authMiddleware,
    videoValidation.requiredIDParams,
    videoController.removeReposted
);

router.patch(
    '/:id/change-privacy',
    authMiddleware,
    videoValidation.changePrivacy,
    videoController.changePrivacy
);

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

router.delete(
    '/:id',
    authMiddleware,
    checkPermission('delete:video'),
    videoValidation.deleteVideo,
    videoController.deleteVideo
);

router.patch(
    '/:id',
    authMiddleware,
    checkPermission('delete:video'),
    videoValidation.updateVideo,
    videoController.updateVideo
);

export default router;
