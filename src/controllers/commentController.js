import { StatusCodes } from 'http-status-codes';
import * as commentService from '~/services/commentService';
import * as userService from '~/services/userService';
import * as notificationService from '~/services/notificationService';
import { io } from '~/sockets/socket';

const getComments = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id: videoId } = req.params;
        const { page, replyTo, cid, incl } = req.query;
        const perPage = replyTo ? 3 : 10;
        const commentId = Number(cid);
        const inclCommentId = Number(incl);
        const { listComments, commentCount } = await commentService.getComments(
            videoId,
            currentUserId,
            replyTo || null,
            commentId,
            inclCommentId,
            page,
            perPage
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

const createComment = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { comment, authorVideoId, tags, parentId, path, videoLink } =
            req.body;
        const { id: videoId } = req.params;
        const commentResult = await commentService.createComment({
            user_id: currentUserId,
            video_id: Number(videoId),
            is_author_video: currentUserId == authorVideoId,
            comment,
            tags,
            parent_id: parentId,
            path,
        });

        const commentData = await commentService.getComment(
            commentResult.id,
            currentUserId,
            ['Video', 'Comment']
        );

        try {
            let subjectResult,
                videoObjectResult,
                commentObjectResult,
                commentParentObjectResult;

            const bulkCreateSubjects = async (includeCmtParentObj = false) => {
                const currentUserData =
                    await userService.getCurrentUser(currentUserId);

                const subject = {
                    object_id: currentUserId,
                    name: currentUserData.nickname,
                    type: 'user',
                    image_url: currentUserData.avatar?.sm,
                    object_link: `/@${currentUserData.username}`,
                };

                const videoObject = {
                    object_id: commentData.video?.id,
                    uuid: commentData.video?.uuid,
                    name: commentData.video?.description,
                    type: 'video',
                    image_url: commentData.video?.thumb?.url,
                    object_link: videoLink,
                };

                const commentObject = {
                    object_id: commentData.id,
                    name: commentData.comment,
                    type: 'comment',
                    object_link: commentData.parent_id
                        ? `?rep=${commentData.parent_id}&cid=${commentData.id}`
                        : `?cid=${commentData.id}`,
                };

                if (includeCmtParentObj) {
                    const commentParentObject = {
                        object_id: commentData.reply_to?.id,
                        name: commentData.reply_to?.comment,
                        type: 'comment',
                        object_link: commentData.reply_to?.parent_id
                            ? `?rep=${commentData.reply_to?.parent_id}&cid=${commentData.reply_to?.id}`
                            : `?cid=${commentData.reply_to?.id}`,
                    };

                    return await notificationService.bulkCreateSubject([
                        subject,
                        commentParentObject,
                        videoObject,
                        commentObject,
                    ]);
                } else {
                    return await notificationService.bulkCreateSubject([
                        subject,
                        videoObject,
                        commentObject,
                    ]);
                }
            };

            // notify for video's author
            if (currentUserId !== commentData.video?.user_id) {
                [subjectResult, videoObjectResult, commentObjectResult] =
                    await bulkCreateSubjects();

                const notificationData = {
                    direct_object_id: videoObjectResult[0].id,
                    indirect_object_id: commentObjectResult[0].id,
                    type: 'comment_video',
                    user_id: commentData.video?.user_id,
                    unique_key: `comment_video:video_${videoId}:user_${commentData.video?.user_id}`,
                    is_read: false,
                };

                await notificationService.createNotification(
                    notificationData,
                    subjectResult[0].id
                );

                //implements socket io for real time notification
                io.to(`user:${commentData.video?.user_id}`).emit(
                    'notification'
                );
            }

            if (parentId) {
                //notify for the replied user
                if (currentUserId !== commentData.reply_to?.user_id) {
                    if (!subjectResult) {
                        [
                            subjectResult,
                            commentParentObjectResult,
                            videoObjectResult,
                            commentObjectResult,
                        ] = await bulkCreateSubjects(true);
                    } else {
                        //parent comment
                        const commentParentObject = {
                            object_id: commentData.reply_to?.id,
                            name: commentData.reply_to?.comment,
                            type: 'comment',
                            object_link: commentData.reply_to?.parent_id
                                ? `?rep=${commentData.reply_to?.parent_id}&cid=${commentData.reply_to?.id}`
                                : `?cid=${commentData.reply_to?.id}`,
                        };

                        commentParentObjectResult =
                            await notificationService.createSubject(
                                commentParentObject
                            );
                    }

                    const notificationData = {
                        direct_object_id: commentParentObjectResult[0].id,
                        indirect_object_id: commentObjectResult[0].id,
                        prep_object_id: videoObjectResult[0].id,
                        type: 'reply_comment',
                        user_id: commentData.reply_to?.user_id,
                        unique_key: `reply_comment:comment_${parentId}:user_${commentData.reply_to?.user_id}`,
                        is_read: false,
                    };

                    await notificationService.createNotification(
                        notificationData,
                        subjectResult[0].id
                    );

                    //implements socket io for real time notification
                    io.to(`user:${commentData.reply_to?.user_id}`).emit(
                        'notification'
                    );
                }
            }

            //notify for users that mentioned
            if (tags.length > 0) {
                if (!subjectResult) {
                    [subjectResult, videoObjectResult, commentObjectResult] =
                        await bulkCreateSubjects();
                }

                const emitedUserIds = tags
                    .map((tag) => tag.tag_user_id)
                    .filter((id) => id !== currentUserId);

                for (const userId of emitedUserIds) {
                    const notificationData = {
                        indirect_object_id: commentObjectResult[0].id,
                        prep_object_id: videoObjectResult[0].id,
                        type: 'mention_comment',
                        user_id: userId,
                        unique_key: `ment_cmt:cmt_${commentData.id}:mentId_${userId}`,
                        is_read: false,
                    };

                    await notificationService.createNotification(
                        notificationData,
                        subjectResult[0].id
                    );
                }

                //implements socket io for real time notification
                const users = emitedUserIds.map((id) => `user:${id}`);
                io.to(users).emit('notification');
            }
        } catch (error) {
            console.log('Error creating notification:', error);
        }

        const data = { ...commentData };
        delete data.video;
        if (parentId) {
            delete data.reply_to;
        }
        res.status(StatusCodes.CREATED).json({
            data,
        });
    } catch (error) {
        next(error);
    }
};

const updateComment = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { comment, tags } = req.body;
        const { id } = req.params;

        await commentService.updateComment(id, comment, tags, currentUserId);
        const data = await commentService.getComment(id, currentUserId);

        //update notification
        await notificationService.updateSubject(
            { name: comment },
            id,
            'comment'
        );

        res.status(StatusCodes.OK).json({
            data,
        });
    } catch (error) {
        next(error);
    }
};

const deleteComment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const currentUserId = req.currentUser?.sub;
        const role = req.currentUser?.role;
        await commentService.deleteComment(id, currentUserId, role);
        res.status(StatusCodes.OK).json({
            comment_id: Number(id),
        });
    } catch (error) {
        next(error);
    }
};

const likeComment = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id: commentId } = req.params;
        const { videoLink } = req.body;
        await commentService.likeComment(commentId, currentUserId);
        const commentData = await commentService.getComment(
            commentId,
            currentUserId,
            ['Video']
        );

        if (currentUserId !== commentData.user?.id) {
            try {
                //insert notification
                const currentUserData =
                    await userService.getCurrentUser(currentUserId);

                const subject = {
                    object_id: currentUserId,
                    name: currentUserData.nickname,
                    type: 'user',
                    image_url: currentUserData.avatar?.sm,
                    object_link: `/@${currentUserData.username}`,
                };

                const directObject = {
                    object_id: commentData.id,
                    name: commentData.comment,
                    type: 'comment',
                    object_link: commentData.parent_id
                        ? `?rep=${commentData.parent_id}&cid=${commentData.id}`
                        : `?cid=${commentData.id}`,
                };

                const prepObject = {
                    object_id: commentData.video_id,
                    uuid: commentData.video?.uuid,
                    name: commentData.video?.description,
                    type: 'video',
                    image_url: commentData.video?.thumb?.url,
                    object_link: videoLink,
                };

                const [subjectResult, directObjectResult, prepObjectResult] =
                    await notificationService.bulkCreateSubject([
                        subject,
                        directObject,
                        prepObject,
                    ]);

                const notificationData = {
                    direct_object_id: directObjectResult[0].id,
                    prep_object_id: prepObjectResult[0].id,
                    type: 'like_comment',
                    user_id: commentData.user?.id,
                    unique_key: `like_comment:comment_${commentId}:user_${commentData.user?.id}`,
                    is_read: false,
                };

                await notificationService.createNotification(
                    notificationData,
                    subjectResult[0].id
                );

                //implements socket io for real time notification
                io.to(`user:${commentData.user?.id}`).emit('notification');
            } catch (error) {
                console.log('Error creating notification:', error);
            }
        }

        const data = { ...commentData };
        delete data.video;
        res.status(StatusCodes.OK).json({
            data,
        });
    } catch (error) {
        next(error);
    }
};

const unlikeComment = async (req, res, next) => {
    try {
        const { id: commentId } = req.params;
        const currentUserId = req.currentUser?.sub;
        await commentService.unLikeComment(commentId, currentUserId);
        const commentData = await commentService.getComment(
            commentId,
            currentUserId
        );

        res.status(StatusCodes.OK).json({
            data: commentData,
        });
    } catch (error) {
        next(error);
    }
};

export {
    getComments,
    createComment,
    updateComment,
    deleteComment,
    likeComment,
    unlikeComment,
};
