import { Router } from 'express';
import * as conversationController from '~/controllers/admin/conversationController';
import authMiddleware from '~/middlewares/authMiddleware';
import checkPermission from '~/middlewares/checkPermission';
import * as conversationValidation from '~/validations/admin/conversationValidation';
const router = Router();

router
    .route('/')
    .get(
        authMiddleware,
        checkPermission('list:conversations', ['super_admin', 'admin']),
        conversationController.getListConversations
    );

router.delete(
    '/:id',
    authMiddleware,
    checkPermission('destroy:conversations', ['super_admin', 'admin']),
    conversationValidation.requiredIDParams,
    conversationController.destroyConversation
);

export default router;
