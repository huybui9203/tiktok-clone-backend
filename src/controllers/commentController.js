import { StatusCodes } from 'http-status-codes';
import * as commentService from '~/services/commentService';

const getComments = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const perPage = 10;
        const { id: videoId } = req.params;
        const { page, replyTo } = req.query;
        const [listComments, commentCount] = await commentService.getComments(
            videoId,
            currentUserId,
            replyTo || null
        );

        return res.status(StatusCodes.OK).json({
            data: listComments,
            meta: {
                pagination: {
                    total: commentCount,
                    per_page: perPage,
                    total_pages: Math.ceil(commentCount / perPage),
                    current_page: Number(page),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const createNew = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { comment, authorVideoId, tags, parentId } = req.body;
        const { id: videoId } = req.params;
        const commentData = await commentService.createNew(videoId, {
            user_id: currentUserId,
            video_id: videoId,
            is_author_video: currentUserId == authorVideoId,
            comment,
            tags,
            parent_id: parentId
        })
        const data = await commentService.getComment(commentData.id, currentUserId)
        res.status(StatusCodes.OK).json({
            data
        })
    } catch (error) {
        next(error)
    }
};

export { getComments, createNew };
