import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StatusCodes } from 'http-status-codes';

import {
    videoMulterUpload,
    uploadVideoToCloud,
    uploadCoverToCloud,
} from '~/utils/uploadFile';
import { io } from '~/sockets/socket';
import { ROLE } from '~/config/roles';
import ApiError from '~/utils/ApiError';
import * as videoServices from '~/services/videoServices';
import * as userService from '~/services/userService';
import * as notificationService from '~/services/notificationService';
import * as chatService from '~/services/chatService';

const uploadVideo = (req, res, next) => {
    videoMulterUpload(req, res, (err) => {
        if (!req.file) {
            next(new ApiError(StatusCodes.BAD_REQUEST, 'No file provided'));
            return;
        }
        if (err instanceof multer.MulterError) {
            next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, err.message));
            return;
        } else if (err) {
            next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, err.message));
            return;
        }
        const { chunk, uploadId } = req.query;
        const { totalChunks } = req.body;
        if (+chunk === +(totalChunks - 1)) {
            const finalPath = `src/public/videos/${uploadId}.final.mp4`;
            const writeStream = fs.createWriteStream(finalPath);

            for (let i = 0; i < totalChunks; i++) {
                const chunkPath = path.join(
                    'src/public/videos',
                    `${uploadId}.part${i}.mp4`
                );
                const data = fs.readFileSync(chunkPath);
                writeStream.write(data);
                fs.unlinkSync(chunkPath);
            }
            writeStream.end();

            writeStream.on('finish', () => {
                uploadVideoToCloud(finalPath).then(([err, video]) => {
                    if (err) {
                        next(new ApiError(err.http_code, err.message));
                        return;
                    } else {
                        res.status(StatusCodes.CREATED).json({
                            message: 'upload video to cloudinary successfull!',
                            uploadId,
                            chunk,
                            phase: 'finished',
                            data: video,
                        });
                    }
                    fs.unlinkSync(finalPath);
                });
            });

            // Event listener for any errors during the write operation
            writeStream.on('error', (err) => {
                next(
                    new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, err.message)
                );
            });
            return;
        }
        res.status(StatusCodes.OK).json({
            message: 'sucesss',
            data: {
                uploadId,
                chunk,
            },
        });
    });
};

const createNew = async (req, res, next) => {
    try {
        const {
            allows,
            description,
            music,
            timePostVideo,
            videoData,
            viewable,
            categoryId,
        } = req.body;

        const currentUserId = req.currentUser?.sub;
        const data = {
            uuid: uuidv4(),
            user_id: currentUserId,
            file_url: videoData.url,
            description,
            music,
            viewable,
            allows,
            category_id: categoryId,
            published_at:
                timePostVideo === 'Now' ? new Date() : new Date(timePostVideo),
        };
        delete videoData.url;
        data.meta = videoData;
        const cover = req.filePath;

        if (cover) {
            const [error, image] = await uploadCoverToCloud(cover);
            fs.unlinkSync(cover);
            if (error) {
                throw new ApiError(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    error.message
                );
            } else {
                data.thumb = {
                    public_id: image.public_id,
                    url: image.secure_url,
                };
            }
        }

        const responseData = await videoServices.createVideo(data);
        res.status(StatusCodes.CREATED).json({
            message: 'success',
            data: responseData,
        });
    } catch (error) {
        next(error);
    }
};

const searchVideo = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { limit, q } = req.query;
        const listVideos = await videoServices.searchVideo(
            q,
            Number(limit),
            currentUserId
        );
        res.status(StatusCodes.OK).json({
            data: listVideos,
            count: limit,
        });
    } catch (error) {
        next(error);
    }
};

const getListVideos = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const perPage = 4;
        const { type, page, categoryId, q } = req.query;
        const { listVideos, videoCount } = await videoServices.getListVideos({
            type,
            categoryId: Number(categoryId),
            keyword: q,
            page,
            perPage,
            currentUserId,
        });

        const data = listVideos.map((video) => {
            const { size, width, height, duration, format } = video.meta;
            return {
                ...video.toJSON(),
                meta: {
                    format,
                    size: Number(size),
                    width: Number(width),
                    height: Number(height),
                    duration: Number(duration),
                },
            };
        });
        res.status(StatusCodes.OK).json({
            data,
            meta: {
                pagination: {
                    total: videoCount,
                    per_page: perPage,
                    count: listVideos.length,
                    total_pages: Math.ceil(videoCount / perPage),
                    current_page: Number(page),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const getVideo = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { uuid } = req.params;
        const { author: videoUsername } = req.query;
        await videoServices.checkVideoWithUsername(videoUsername, uuid);
        const videoData = await videoServices.getVideoWithCheckPrivacy(
            uuid,
            currentUserId
        );
        res.status(StatusCodes.OK).json({
            data: videoData,
        });
    } catch (error) {
        next(error);
    }
};

const removeExistFile = (req, res, next) => {
    const { chunk, uploadId } = req.body;
    const filePath = path.join(
        'src/public/videos',
        `${uploadId}.part${chunk}.mp4`
    );
    try {
        if (fs.existsSync(filePath)) {
            console.log('Tệp đã tồn tại (đồng bộ).', filePath);
            fs.unlinkSync(filePath);
            res.json({ msg: 'success' });
        } else {
            console.log('Tệp không tồn tại (đồng bộ).');
            res.json({ msg: 0 });
        }
    } catch (error) {
        next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
};

const likeVideo = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id: videoId } = req.params;
        const { videoLink } = req.body;

        await videoServices.likeVideo({
            user_id: currentUserId,
            likeable_id: videoId,
            likeable_type: 'video',
        });

        const videoData = await videoServices.getVideo(
            { id: videoId },
            currentUserId
        );

        if (currentUserId !== videoData.user?.id) {
            try {
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
                    object_id: videoData.id,
                    uuid: videoData.uuid,
                    name: videoData.description,
                    type: 'video',
                    image_url: videoData.thumb?.url,
                    object_link: videoLink,
                };

                const [subjectResult, directObjectResult] =
                    await notificationService.bulkCreateSubject([
                        subject,
                        directObject,
                    ]);

                const notificationData = {
                    direct_object_id: directObjectResult[0].id,
                    type: 'like_video',
                    user_id: videoData.user?.id,
                    unique_key: `like_video:video_${videoId}:user_${videoData.user?.id}`,
                    is_read: false,
                };

                await notificationService.createNotification(
                    notificationData,
                    subjectResult[0].id
                );

                io.to(`user:${videoData.user?.id}`).emit('notification');
            } catch (error) {
                console.log('Error creating notification:', error);
            }
        }

        res.status(StatusCodes.CREATED).json({
            data: videoData,
        });
    } catch (error) {
        next(error);
    }
};

const unlikeVideo = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id: videoId } = req.params;

        await videoServices.unlikeVideo({
            user_id: currentUserId,
            likeable_id: videoId,
            likeable_type: 'video',
        });

        const videoData = await videoServices.getVideo(
            { id: videoId },
            currentUserId
        );

        res.status(StatusCodes.OK).json({
            data: videoData,
        });
    } catch (error) {
        next(error);
    }
};

const addVideoToFavorite = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id: videoId } = req.params;

        await videoServices.addVideoToFavorite({
            user_id: currentUserId,
            video_id: videoId,
        });

        const videoData = await videoServices.getVideo(
            { id: videoId },
            currentUserId
        );
        res.status(StatusCodes.CREATED).json({
            data: videoData,
        });
    } catch (error) {
        next(error);
    }
};

const removeVideoFromFavorite = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id: videoId } = req.params;

        await videoServices.removeVideoFromFavorite({
            user_id: currentUserId,
            video_id: videoId,
        });

        const videoData = await videoServices.getVideo(
            { id: videoId },
            currentUserId
        );
        res.status(StatusCodes.CREATED).json({
            data: videoData,
        });
    } catch (error) {
        next(error);
    }
};

const changePrivacy = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id } = req.params;
        const { viewable } = req.body;
        await videoServices.updateVideo(id, currentUserId, {
            viewable,
        });
        const video = await videoServices.getVideo({ id }, currentUserId);
        res.status(StatusCodes.OK).json({
            data: video,
        });
    } catch (error) {
        next(error);
    }
};

const shareVideoInChat = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { optionalMessage, sharedData, postId, conversationIds } =
            req.body;
        await videoServices.shareVideoInChat(
            currentUserId,
            optionalMessage,
            sharedData,
            postId,
            conversationIds
        );
        const videoData = await videoServices.getVideo(
            { id: postId },
            currentUserId
        );

        const rooms = conversationIds.map((id) => `conversation:${id}`);
        io.to(rooms).emit('shareVideoInChat', {
            conversationIds,
            exceptNotificationToId: currentUserId,
        });

        await chatService.bulkUpdateLastView(currentUserId, conversationIds);

        res.status(StatusCodes.CREATED).json({
            message: 'share success',
            method: 'message',
            conversation_id: conversationIds,
            video_data: videoData,
        });
    } catch (error) {
        next(error);
    }
};

const shareVideoToFriends = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const {
            optionalMessage,
            sharedData,
            postId,
            conversationIds,
            userIds,
        } = req.body;

        const newConversationIds = await videoServices.shareVideoInChat(
            currentUserId,
            optionalMessage,
            sharedData,
            postId,
            conversationIds,
            userIds
        );
        const videoData = await videoServices.getVideo(
            { id: postId },
            currentUserId
        );

        const rooms = newConversationIds.map((id) => `conversation:${id}`);
        io.to(rooms).emit('shareVideoInChat', {
            conversationIds: newConversationIds,
            exceptNotificationToId: currentUserId,
        });

        await chatService.bulkUpdateLastView(currentUserId, newConversationIds);

        res.status(StatusCodes.CREATED).json({
            message: 'share success',
            method: 'message',
            conversation_id: newConversationIds,
            video_data: videoData,
        });
    } catch (error) {
        next(error);
    }
};

const shareVideoByRepost = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { postId, caption } = req.body;
        await videoServices.shareVideoByRepost(currentUserId, postId, caption);
        const videoData = await videoServices.getVideo(
            { id: postId },
            currentUserId
        );
        res.status(StatusCodes.CREATED).json({
            message: 'share success',
            method: 'repost',
            video_data: videoData,
        });
    } catch (error) {
        next(error);
    }
};

const removeReposted = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id } = req.params;
        const postId = Number(id);
        await videoServices.removeReposted(currentUserId, postId);
        const videoData = await videoServices.getVideo(
            { id: postId },
            currentUserId
        );
        res.status(StatusCodes.OK).json({
            message: 'success',
            video_data: videoData,
        });
    } catch (error) {
        next(error);
    }
};

const addView = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { videoId, duration, lastViewAt, viewNumber, videoUserId } =
            req.body;
        if ((new Date() - new Date(lastViewAt)) / 1000 / 60 < 60) {
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                'Currently, cannot create new resources'
            );
        }

        if (currentUserId === videoUserId) {
            return res.status(StatusCodes.NO_CONTENT).json();
        }

        await videoServices.addView(
            currentUserId,
            videoId,
            duration,
            viewNumber
        );
        const videoData = await videoServices.getVideo(
            { id: videoId },
            currentUserId
        );
        res.status(StatusCodes.CREATED).json({
            message: 'success',
            data: videoData,
        });
    } catch (error) {
        next(error);
    }
};

const getFollowingsWithNewestVideos = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const perPage = 4;
        const { page } = req.query;
        const { listFollowingWithVideos, count } =
            await videoServices.getFollowingsWithNewestVideos(
                currentUserId,
                page,
                perPage
            );
        res.status(StatusCodes.OK).json({
            data: listFollowingWithVideos,
            meta: {
                pagination: {
                    total: count,
                    per_page: perPage,
                    count: listFollowingWithVideos.length,
                    total_pages: Math.ceil(count / perPage),
                    current_page: Number(page),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const getFriendsWithNewestVideos = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const perPage = 4;
        const { page } = req.query;
        const { listFollowingWithVideos, count } =
            await videoServices.getFriendsWithNewestVideos(
                currentUserId,
                page,
                perPage
            );
        res.status(StatusCodes.OK).json({
            data: listFollowingWithVideos,
            meta: {
                pagination: {
                    total: count,
                    per_page: perPage,
                    count: listFollowingWithVideos.length,
                    total_pages: Math.ceil(count / perPage),
                    current_page: Number(page),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const getVideoCategories = async (req, res, next) => {
    try {
        const { categories, count } = await videoServices.getVideoCategories();
        res.status(StatusCodes.OK).json({
            data: categories,
            count,
        });
    } catch (error) {
        next(error);
    }
};

const report = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { objectId, objectType, reasonId, ownerId } = req.body;
        await videoServices.report(
            currentUserId,
            objectType,
            objectId,
            reasonId,
            ownerId
        );
        res.status(StatusCodes.CREATED).json({
            message: 'success',
            data: {
                object_id: objectId,
                object_type: objectType,
                is_reported: true,
            },
        });
    } catch (error) {
        next(error);
    }
};

const unreport = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id: objectId } = req.params;
        const { type: objectType } = req.query;
        await videoServices.unreport(currentUserId, objectId, objectType);
        res.status(StatusCodes.OK).json({
            message: 'success',
            data: {
                object_id: Number(objectId),
                objectType,
                is_reported: false,
            },
        });
    } catch (error) {
        next(error);
    }
};

const deleteVideo = async (req, res, next) => {
    try {
        //TODO: delete video and thumb on cloud
        const currentUserId = req.currentUser?.sub;
        const role = req.currentUser?.role;
        const { id: videoId } = req.params;
        const { authorId } = req.query;
        if (role === ROLE.user && authorId === currentUserId) {
            await videoServices.deleteVideo(videoId, currentUserId);
        } else {
            await videoServices.deleteVideo(videoId, authorId);
        }
        res.status(StatusCodes.OK).json({
            message: 'success',
            video_id: Number(videoId),
        });
    } catch (error) {
        next(error);
    }
};

const updateVideo = async (req, res, next) => {
    try {
        //TODO: delete video and thumb on cloud
        const currentUserId = req.currentUser?.sub;
        const role = req.currentUser?.role;
        const { id: videoId } = req.params;
        const { categoryId, description, allows } = req.body;
        await videoServices.updateVideo(
            videoId,
            currentUserId,
            { category_id: categoryId, description, allows },
            role
        );
        res.status(StatusCodes.OK).json({
            message: 'success',
            video_id: Number(videoId),
        });
    } catch (error) {
        next(error);
    }
};

const getMyListVideos = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { page, sortBy, sortType, q: searchStr, privacy } = req.query;
        const perPage = 5;
        let sortByField = sortBy;
        switch (sortBy) {
            case 'date':
                sortByField = 'published_at';
                break;
            case 'privacy':
                sortByField = 'viewable';
                break;
            case 'views':
                sortByField = 'views_count';
                break;
            case 'likes':
                sortByField = 'likes_count';
                break;
            case 'comments':
                sortByField = 'comments_count';
                break;
            case 'shares':
                sortByField = 'shares_count';
                break;
            default:
                break;
        }
        const filter = {};
        if (privacy) {
            filter.viewable = privacy;
        }
        const { listVideos, count } = await videoServices.getMyListVideos(
            currentUserId,
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

export {
    addView,
    addVideoToFavorite,
    createNew,
    changePrivacy,
    deleteVideo,
    getListVideos,
    getVideo,
    getFollowingsWithNewestVideos,
    getFriendsWithNewestVideos,
    getVideoCategories,
    getMyListVideos,
    likeVideo,
    removeVideoFromFavorite,
    removeReposted,
    report,
    removeExistFile,
    shareVideoInChat,
    shareVideoToFriends,
    shareVideoByRepost,
    unlikeVideo,
    unreport,
    uploadVideo,
    updateVideo,
    searchVideo,
};
