import express from 'express';
import * as reportController from '~/controllers/reportController';
import authMiddleware from '~/middlewares/authMiddleware';
const router = express.Router();

router.get('/reasons', authMiddleware, reportController.getReportReasons);
router.get('/', authMiddleware, reportController.getListReports);

export default router;
