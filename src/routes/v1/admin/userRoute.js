import { Router } from 'express';
import * as userController from '~/controllers/admin/userController';
import authMiddleware from '~/middlewares/authMiddleware';
import checkPermission from '~/middlewares/checkPermission';
import uploadSingleFile from '~/middlewares/uploadSingleFile';
import * as userValidation from '~/validations/admin/userValidation';
const router = Router();

router
    .route('/')
    .get(
        authMiddleware,
        checkPermission('list:user', ['super_admin', 'admin']),
        userController.getListUsers
    )
    .post(
        authMiddleware,
        checkPermission('create:user', ['super_admin', 'admin']),
        uploadSingleFile.onlyImage,
        userValidation.createUser,
        userController.createUser
    );

router.patch(
    '/:id',
    authMiddleware,
    checkPermission('edit:user', ['super_admin', 'admin']),
    uploadSingleFile.onlyImage,
    userValidation.updateUser,
    userController.updateUser
);
export default router;
