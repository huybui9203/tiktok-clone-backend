import { Router } from 'express';
import * as chatController from '~/controllers/chatController';
import * as chatValidation from '~/validations/chatValidation';
import authMiddleware from '~/middlewares/authMiddleware';
import uploadSingleFile from '~/middlewares/uploadSingleFile';
import uploadMutipleFile from '~/middlewares/uploadMultipleFile';

const router = Router();
router.post(
    '/',
    authMiddleware,
    uploadMutipleFile.attachments,
    chatValidation.sendMessage,
    chatController.sendMessage
);

router.delete('/:id/unsend', authMiddleware, chatController.unsendMessage);
router.post(
    '/:id/react',
    authMiddleware,
    chatValidation.reactMessage,
    chatController.reactMessage
);

router.delete(
    '/:id/reactions/:reactionId',
    authMiddleware,
    chatValidation.removeReaction,
    chatController.removeReaction
);

router.get(
    '/:id/reactions',
    authMiddleware,
    chatValidation.getListReactions,
    chatController.getListReactions
);

router.get(
    '/unread-count',
    authMiddleware,
    chatController.getUnreadMessageCount
);

export default router;
