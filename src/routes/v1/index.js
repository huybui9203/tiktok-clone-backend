import { Router } from 'express';
import videoRouter from './videoRoute';
import conversationRouter from './conversationRoute';
import messageRouter from './messageRoute';
import commentRouter from './commentRoute';
import userRouter from './userRoute';
import authRouter from './authRoute';
import notificationRouter from './notificationRoute';
import adminRouter from './admin';
import otherRouter from './otherRoute';
const router = Router();

router.use('/videos', videoRouter);
router.use('/comments', commentRouter);
router.use('/users', userRouter);
router.use('/auth', authRouter);
router.use('/messages', messageRouter);
router.use('/conversations', conversationRouter);
router.use('/notifications', notificationRouter);
router.use('/admin', adminRouter);
router.use('/', otherRouter);

export default router;
