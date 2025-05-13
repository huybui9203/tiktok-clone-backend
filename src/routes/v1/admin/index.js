import { Router } from 'express';
import userRouter from './userRoute';
import reportRouter from './reportRoute';
import videoRouter from './videoRoute';
import conversationRouter from './conversationRoute';
import dashboardRouter from './dashboardRoute';

const router = Router();

router.use('/users', userRouter);
router.use('/reports', reportRouter);
router.use('/videos', videoRouter);
router.use('/conversations', conversationRouter);
router.use('/dashboard', dashboardRouter);

export default router;
