import { StatusCodes } from 'http-status-codes';
import * as dashboardService from '~/services/admin/dashboardService';

const analytics = async (req, res, next) => {
    try {
        const data = await dashboardService.analytics();
        res.status(StatusCodes.OK).json({
            data,
        });
    } catch (error) {
        next(error);
    }
};

const userMonthlyStats = async (req, res, next) => {
    try {
        const { year } = req.query;
        const data = await dashboardService.userMonthlyStats(Number(year));
        res.status(StatusCodes.OK).json({
            data,
        });
    } catch (error) {
        next(error);
    }
};

const videoMonthlyStats = async (req, res, next) => {
    try {
        const { year } = req.query;
        const data = await dashboardService.videoMonthlyStats(Number(year));
        res.status(StatusCodes.OK).json({
            data,
        });
    } catch (error) {
        next(error);
    }
};

export { analytics, userMonthlyStats, videoMonthlyStats };
