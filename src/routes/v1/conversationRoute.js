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

router.get(
    '/:id/member-requests',
    authMiddleware,
    chatValidation.getListByCursor,
    chatController.getListMemberRequests
);

router.patch(
    '/:id/make-admin',
    authMiddleware,
    chatValidation.approveMember,
    chatController.makeAdmin
);

router.patch(
    '/:id/remove-as-admin',
    authMiddleware,
    chatValidation.approveMember,
    chatController.removeAsAdmin
);

router.patch(
    '/:id/approve-member',
    authMiddleware,
    chatValidation.approveMember,
    chatController.approveMember
);

router.delete(
    '/:id/decline-member/:memberId',
    authMiddleware,
    chatValidation.declineMember,
    chatController.declineMember
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

router.get('/:id/role', authMiddleware, chatController.getGroupRole);

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

router.delete(
    '/:id',
    authMiddleware,
    chatValidation.requiredConversationId,
    chatController.deleteConversation
);
export default router;
