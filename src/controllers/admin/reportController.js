import { StatusCodes } from 'http-status-codes';
import * as reportService from '~/services/admin/reportService';
import * as commentService from '~/services/commentService';
import * as videoService from '~/services/videoServices';

const getListReports = async (req, res, next) => {
    try {
        const { page, sortBy, sortType, q: searchStr, isResolved } = req.query;
        const perPage = 5;
        let allowRoles;
        let sortByField;
        switch (sortBy) {
            case 'id':
                sortByField = 'id';
                break;
            case 'user':
                sortByField = 'username';
                break;
            case 'type':
                sortByField = 'reportable_type';
                break;
            case 'status':
                sortByField = 'is_resolved';
                break;
            case 'date':
                sortByField = 'createdAt';
                break;
            case 'action':
                sortByField = 'action';
                break;
            default:
                break;
        }
        const filter = {};
        if (isResolved !== undefined) {
            filter.is_resolved = isResolved === 'true' ? true : false;
        }
        const { listReports, count } = await reportService.getListReports(
            page,
            perPage,
            sortByField,
            sortType,
            searchStr,
            filter,
            allowRoles
        );
        res.status(StatusCodes.OK).json({
            data: listReports,
            meta: {
                pagination: {
                    total: count,
                    per_page: perPage,
                    total_pages: Math.ceil(count / perPage),
                    current_page: Number(page),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const getReportDetail = async (req, res, next) => {
    try {
        const { type } = req.query;
        const { id } = req.params;
        const reportData = await reportService.getReportDetail(
            Number(id),
            type
        );
        res.status(StatusCodes.OK).json({
            data: reportData,
        });
    } catch (error) {
        next(error);
    }
};

const handleReport = async (req, res, next) => {
    try {
        const role = req.currentUser?.role;
        const { id: reportId } = req.params;
        const { objectId, objectType, ownerId, action } = req.body;

        if (action === 'delete' && objectType === 'video') {
            await videoService.deleteVideo(objectId, ownerId, role);
        } else if (action === 'delete' && objectType === 'comment') {
            await commentService.deleteComment(objectId, ownerId, role);
        }
        await reportService.handleReport(reportId, action);
        res.status(StatusCodes.OK).json({
            msg: 'success',
        });
    } catch (error) {
        next(error);
    }
};

export { getListReports, getReportDetail, handleReport };
