import { StatusCodes } from 'http-status-codes';
import * as videoService from '~/services/admin/videoService';
import { updateVideo } from '~/services/videoServices';

const getListVideos = async (req, res, next) => {
    try {
        const { page, sortBy, sortType, q: searchStr, status } = req.query;
        const perPage = 5;
        let sortByField = sortBy;
        switch (sortBy) {
            case 'author':
                sortByField = 'username';
                break;
            case 'privacy':
                sortByField = 'viewable';
                break;
            default:
                break;
        }
        const filter = {};
        if (status) {
            filter.status = status;
        }
        const { listVideos, count } = await videoService.getListVideos(
            page,
            perPage,
            sortByField,
            sortType,
            searchStr,
            filter
        );
        res.status(StatusCodes.OK).json({
            data: listVideos,
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

const getVideoDetail = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = await videoService.getVideoDetail(id);
        res.status(StatusCodes.OK).json({
            data,
        });
    } catch (error) {
        next(error);
    }
};

const approvedVideo = async (req, res, next) => {
    try {
        const role = req.currentUser?.role;
        const { id } = req.params;
        const { status } = req.body;
        await updateVideo(id, null, { status }, role);
        res.status(StatusCodes.OK).json({
            message: 'success',
            video_status: status,
        });
    } catch (error) {
        next(error);
    }
};

const getListCategories = async (req, res, next) => {
    try {
        const { page, sortBy, sortType, q: searchStr } = req.query;
        const perPage = 5;
        const { listCategories, count } = await videoService.getListCategories(
            page,
            perPage,
            sortBy,
            sortType,
            searchStr
        );
        res.status(StatusCodes.OK).json({
            data: listCategories,
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

const createCategory = async (req, res, next) => {
    try {
        const { name } = req.body;
        await videoService.createCategory({ name });
        res.status(StatusCodes.OK).json({
            message: 'success',
        });
    } catch (error) {
        next(error);
    }
};

const updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        await videoService.updateCategory(id, { name });
        res.status(StatusCodes.OK).json({
            message: 'success',
            category_id: Number(id),
        });
    } catch (error) {
        next(error);
    }
};

const deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        await videoService.deleteCategory(id);
        res.status(StatusCodes.OK).json({
            message: 'success',
            category_id: Number(id),
        });
    } catch (error) {
        next(error);
    }
};

export {
    getListVideos,
    getVideoDetail,
    approvedVideo,
    getListCategories,
    createCategory,
    updateCategory,
    deleteCategory,
};
