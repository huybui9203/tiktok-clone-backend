import { Router } from 'express';
import * as chatController from '~/controllers/chatController';
import * as chatValidation from '~/validations/chatValidation';
import authMiddleware from '~/middlewares/authMiddleware';
import uploadSingleFile from '~/middlewares/uploadSingleFile';

const router = Router();
router.get('/', authMiddleware, chatController.getListConversations);
router.get('/check', authMiddleware, chatController.checkPrivateConversation);
router.get(
    '/:id/messages',
    authMiddleware,
    chatValidation.getListByCursor,
    chatController.getListMessages
);
router.get('/search', authMiddleware, chatController.searchConversation);
router.get(
    '/:id/attachments',
    authMiddleware,
    chatValidation.getListByCursor,
    chatController.getListAttachmentsOfConversation
);

router.get(
    '/:id/members',
    authMiddleware,
    chatValidation.getListByCursor,
    chatController.getListMembersOfConversation
);

router.patch(
    '/:id/viewed',
    authMiddleware,
    chatValidation.updateLastViewedChat,
    chatController.updateLastViewedChat
);

router.patch(
    '/:id/customize',
    authMiddleware,
    uploadSingleFile.onlyImage,
    chatValidation.customizeConversation,
    chatController.customizeConversation
);

router.get(
    '/:id/member',
    authMiddleware,
    chatValidation.requiredConversationId,
    chatController.getMember
);

router.get(
    '/:id/suggested-users',
    authMiddleware,
    chatValidation.requiredConversationId,
    chatController.getSuggestedUsers
);

router.post(
    '/:id/members',
    authMiddleware,
    chatValidation.addMembers,
    chatController.addMembers
);

router.post(
    '/:id/leave',
    authMiddleware,
    chatValidation.addMembers,
    chatController.leaveConversation
);

export default router;
