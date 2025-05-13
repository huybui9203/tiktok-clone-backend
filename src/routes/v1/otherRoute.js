import express from 'express';
import * as videoController from '~/controllers/videoController';
import authMiddleware from '~/middlewares/authMiddleware';
const router = express.Router();

router.get('/report-reasons', authMiddleware, videoController.getReportReasons);

export default router;
