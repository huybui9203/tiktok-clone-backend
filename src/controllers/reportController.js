import { StatusCodes } from 'http-status-codes';
import * as reportService from '~/services/reportService';
import formatDate from '~/utils/formatDate';

const getListReports = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { lastTime, lastId } = req.query;
        const perPage = 10;
        const dateTimeValue = formatDate(Number(lastTime));

        const { listReports, count } = await reportService.getListReports(
            dateTimeValue,
            lastId,
            currentUserId,
            perPage
        );

        res.status(StatusCodes.OK).json({
            data: listReports,
            meta: {
                pagination: {
                    total: count,
                    per_page: perPage,
                    page_count: listReports.length,
                    next_cursor:
                        listReports.length < perPage
                            ? null
                            : {
                                  last_time: new Date(
                                      listReports.at(-1)?.updatedAt
                                  ).getTime(),
                                  last_id: listReports.at(-1)?.id,
                              },
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const getReportReasons = async (req, res, next) => {
    try {
        const { listReasons, count } = await reportService.getReportReasons();
        res.status(StatusCodes.OK).json({
            data: listReasons,
            count,
        });
    } catch (error) {
        next(error);
    }
};

export { getReportReasons, getListReports };
