import { Router } from 'express';
import videoRouter from './videoRoute';
import userRouter from './userRoute';
import authRouter from './authRoute';
const router = Router();

router.use('/videos', videoRouter);
router.use('/comments', videoRouter);
router.use('/users', userRouter);
router.use('/auth', authRouter);

export default router;
