import { StatusCodes } from 'http-status-codes';
import db from '~/models';
import fs from 'fs';
import ApiError from '~/utils/ApiError';
import {
    destroyImage,
    imageMulterUpload,
    uploadImageToCloud,
} from '~/utils/uploadFile';
import * as userService from '~/services/userService';
import * as notificationService from '~/services/notificationService';
import { io } from '~/sockets/socket';
import { ROLE } from '~/config/roles';

const updateUser = async (req, res, next) => {
    const { gender, username, email } = req.body;
    const { id } = req.params;

    const formData = { ...req.body };
    try {
        const data = await db.User.update(formData, {
            where: {
                id,
            },
        });

        res.json({
            data: data,
        });
    } catch (error) {
        next(new ApiError(500, error.message));
    }
};

const updateAvatar = (req, res, next) => {
    imageMulterUpload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            next(new ApiError(422, err.message));
            return;
        } else if (err) {
            next(new ApiError(422, err.message));
            return;
        }

        const { path } = req.file;

        //upload to cloud
        uploadImageToCloud(path).then(([err, image]) => {
            if (err) {
                next(new ApiError(err.http_code, err.message));
            } else {
                res.json({
                    message: 'upload image to cloudinary successfull!',
                    data: image,
                });
            }
            fs.unlinkSync(path);
        });
    });
};

const getProfileByUsername = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const role = req.currentUser?.role;
        const { username } = req.params;
        let allowRoles;
        if (role === ROLE.user) {
            allowRoles = ROLE.user;
        }
        const user = await userService.getProfileByUsername(
            username,
            currentUserId,
            allowRoles
        );

        res.status(StatusCodes.OK).json({
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { username, nickname, bio, publicId, lastNicknameUpdatedAt } =
            req.body;
        const intervalTimeAllowed = 7 * 24 * 60 * 60 * 1000;
        if (
            nickname &&
            lastNicknameUpdatedAt &&
            new Date(
                new Date(lastNicknameUpdatedAt).getTime() + intervalTimeAllowed
            ) > new Date()
        ) {
            return new ApiError(
                StatusCodes.UNPROCESSABLE_ENTITY,
                'Cannot process because this action is limited to once every 7 days'
            );
        }
        const data = { username, nickname, bio };
        if (nickname) {
            data.nickname_updated_at = new Date();

            //update notification
            await notificationService.updateSubject(
                { name: nickname },
                currentUserId,
                'user'
            );
        }
        const imagePath = req.filePath;

        if (imagePath) {
            const [error, image] = await uploadImageToCloud(imagePath);
            fs.unlinkSync(imagePath);
            if (error) {
                throw new ApiError(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    error.message
                );
            } else {
                data.avatar = {
                    public_id: image.public_id,
                    lg: image.secure_url,
                    sm: image.eager[0].secure_url,
                };
            }
        }

        const listPromises = [userService.updateProfile(currentUserId, data)];
        publicId ? listPromises.push(destroyImage(publicId)) : listPromises;

        await Promise.all(listPromises);

        res.status(StatusCodes.OK).json({
            data,
            message: 'update profile successfully',
        });
    } catch (error) {
        next(error);
    }
};

const checkValidUsername = async (req, res, next) => {
    try {
        const { username } = req.query;
        const user = await userService.getUserByUsername(username);
        res.status(StatusCodes.OK).json({
            value: username,
            is_valid: !user,
            recommend_value: [],
        });
    } catch (error) {
        next(error);
    }
};

const getListFriends = async (req, res, next) => {
    try {
        const { id: userId } = req.params;
        const { page: currentPage, q: searchStr, type } = req.query;
        const perPage = 10;
        const [listFriends, friendCount] = await userService.getListFriends(
            userId,
            searchStr,
            type,
            perPage,
            currentPage
        );
        res.status(StatusCodes.OK).json({
            data: listFriends,
            meta: {
                pagination: {
                    total: friendCount[0].friends_count,
                    per_page: perPage,
                    total_pages: Math.ceil(
                        friendCount[0].friends_count / perPage
                    ),
                    current_page: Number(currentPage),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const searchUsers = async (req, res, next) => {
    try {
        const perPage = 10;
        const { q: keyword, page: currentPage, type } = req.query;
        const role = req.currentUser?.role;
        let allowRoles;
        if (role === ROLE.admin || role === ROLE.user) {
            allowRoles = [ROLE.user];
        }
        const { count, listUsers } = await userService.searchUsers(
            keyword,
            perPage,
            currentPage,
            type,
            allowRoles
        );
        res.status(StatusCodes.OK).json({
            data: listUsers,
            meta: {
                pagination: {
                    total: count,
                    per_page: perPage,
                    total_pages: Math.ceil(count / perPage),
                    current_page: Number(currentPage),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const getListSuggested = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const role = req.currentUser?.role;
        const limit = { less: 5, all: 25 };
        const { type } = req.query; //less | all
        if (!limit[type]) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid request');
        }
        let allowRoles;
        if (role === ROLE.user) {
            allowRoles = ROLE.user;
        }
        const listSuggested = await userService.getListSuggested(
            limit[type],
            currentUserId,
            allowRoles
        );
        res.status(StatusCodes.OK).json({
            data: listSuggested,
            meta: {
                type,
                total: listSuggested.length,
            },
        });
    } catch (error) {
        next(error);
    }
};

const getListFollowings = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { page } = req.query;
        const perPage = 5;
        const { listFollowings, followingsCount } =
            await userService.getListFollowings(currentUserId, page, perPage);
        res.status(StatusCodes.OK).json({
            data: listFollowings,
            meta: {
                pagination: {
                    total: followingsCount[0].followings_count,
                    per_page: perPage,
                    total_pages: Math.ceil(
                        followingsCount[0].followings_count / perPage
                    ),
                    current_page: Number(page),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const getListVideos = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { page } = req.query;
        const { username } = req.params;
        const perPage = 4;
        const { listVideos, videoCount } = await userService.getListVideos(
            username,
            page,
            perPage,
            currentUserId
        );
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
                    total_pages: Math.ceil(videoCount / perPage),
                    current_page: Number(page),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const followUser = async (req, res, next) => {
    try {
        const followerId = req.currentUser?.sub;
        const { id: followingId } = req.params;
        await userService.followUser(followerId, followingId);
        const userData = await userService.getUserById(followingId, followerId);

        if (followerId !== followingId) {
            try {
                //insert notification
                const currentUserData = await userService.getUserById(
                    followerId,
                    followingId
                );

                const subject = {
                    object_id: followerId,
                    name: currentUserData.nickname,
                    type: 'user',
                    image_url: currentUserData.avatar?.sm,
                    object_link: `/@${currentUserData.username}`,
                };

                const subjectResult =
                    await notificationService.createSubject(subject);

                const type = currentUserData.toJSON()?.is_followed
                    ? 'follow_back'
                    : 'follow';
                const notificationData = {
                    type,
                    user_id: followingId,
                    unique_key: `${type}:user_${followingId}`,
                    is_read: false,
                };

                await notificationService.createNotification(
                    notificationData,
                    subjectResult[0].id
                );

                //implements socket io for real time notification
                io.to(`user:${followingId}`).emit('notification');
            } catch (error) {
                console.log('Error creating notification:', error);
            }
        }

        res.status(StatusCodes.CREATED).json({
            data: userData,
        });
    } catch (error) {
        next(error);
    }
};

const unfollowUser = async (req, res, next) => {
    try {
        const followerId = req.currentUser?.sub;
        const { id: followingId } = req.params;
        await userService.unfollowUser(followerId, followingId);
        const userData = await userService.getUserById(followingId, followerId);
        res.status(StatusCodes.OK).json({
            data: userData,
        });
    } catch (error) {
        next(error);
    }
};

const getListVideosLiked = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id: userId } = req.params;
        const { page } = req.query;
        const perPage = 4;
        if (Number(userId) !== currentUserId) {
            throw new ApiError(
                StatusCodes.FORBIDDEN,
                `You don't have permision to access this resource`
            );
        }
        const { listVideos, videoCount } = await userService.getListVideosLiked(
            currentUserId,
            page,
            perPage
        );
        res.status(StatusCodes.OK).json({
            data: listVideos,
            meta: {
                pagination: {
                    total: videoCount,
                    per_page: perPage,
                    total_pages: Math.ceil(videoCount / perPage),
                    current_page: Number(page),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const getListFavoriteVideos = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { page } = req.query;
        const perPage = 4;
        const { id: userId } = req.params;
        if (Number(userId) !== currentUserId) {
            throw new ApiError(
                StatusCodes.FORBIDDEN,
                `You don't have permision to access this resource`
            );
        }
        const { listVideos, videoCount } =
            await userService.getListFavoriteVideos(
                currentUserId,
                page,
                perPage
            );
        res.status(StatusCodes.OK).json({
            data: listVideos,
            meta: {
                pagination: {
                    total: videoCount,
                    per_page: perPage,
                    total_pages: Math.ceil(videoCount / perPage),
                    current_page: Number(page),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const getListVideosReposted = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { page } = req.query;
        const perPage = 4;
        const { id: userId } = req.params;

        const { listVideos, videoCount } =
            await userService.getListVideosReposted(
                Number(userId),
                currentUserId,
                page,
                perPage
            );
        res.status(StatusCodes.OK).json({
            data: listVideos,
            meta: {
                pagination: {
                    total: videoCount,
                    per_page: perPage,
                    total_pages: Math.ceil(videoCount / perPage),
                    current_page: Number(page),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.id;
        const role = req.currentUser?.role;
        const { id: userId } = req.params;
        if (role === ROLE.user) {
            await userService.deleteUser(currentUserId, ROLE.user);
        } else if (role === ROLE.admin) {
            // await userService.deleteUser(userId, ROLE.user);
        } else if (role === ROLE.superAdmin) {
            await userService.deleteUser(userId);
        }
        res.status(StatusCodes.OK).json({
            message: 'success',
        });
    } catch (error) {
        next(error);
    }
};

export {
    updateUser,
    updateAvatar,
    getProfileByUsername,
    checkValidUsername,
    updateProfile,
    getListFriends,
    searchUsers,
    getListSuggested,
    getListFollowings,
    getListVideos,
    followUser,
    unfollowUser,
    getListVideosLiked,
    getListFavoriteVideos,
    getListVideosReposted,
    deleteUser,
};
