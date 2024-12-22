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
import * as tokenService from '~/services/tokenService';
import { where } from 'sequelize';
import { jwtTypes } from '~/utils/constants';

const getAll = async (req, res, next) => {
    try {
        const usersData = await db.User.findAll();
        res.json({
            data: usersData,
            meta: {
                token: 'abc',
            },
        });
    } catch (error) {
        next(error);
    }
};

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
        const currentUserId = req.currentUser?.sub
        const { username } = req.params;
        const { page } = req.query;
        const perPage = 4;

        const user = await userService.getProfileByUsername(
            username,
            currentUserId,
            page,
            perPage
        );

        res.status(StatusCodes.OK).json({
            data: user,
            meta: {
                pagination: {
                    current_page: Number(page),
                    total_pages: Math.ceil(user.videos_count / perPage),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub
        const { username, nickname, bio, publicId } = req.body;
        const data = { username, nickname, bio };
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

const getFavoriteVideos = async (req, res, next) => {
    const { id } = req.params;
    try {
        // const user = await db.User.findAll({
        //     attributes: ['id', 'username'],
        //     where: {
        //         id,
        //     },
        //     include: [
        //         {
        //             model: db.Video,
        //             as: 'liked_videos',
        //             // attributes: ['id'],
        //             through: {
        //                 attributes: [],
        //             },
        //         },
        //         {
        //             model: db.Comment,
        //             as: 'liked_comments',
        //             // attributes: ['id'],
        //             through: {
        //                 attributes: [],
        //             },
        //         },
        //     ],

        // });

        const video = await db.Video.findByPk(id, {
            include: [
                {
                    model: db.User,
                    as: 'liked_users',
                    through: { attributes: [] },
                },
            ],
        });
        res.json(video);
    } catch (error) {
        next(error);
    }
};

const checkValidUsername = async (req, res, next) => {
    try {
        const { username } = req.params;
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

export {
    getAll,
    updateUser,
    updateAvatar,
    getProfileByUsername,
    getFavoriteVideos,
    checkValidUsername,
    updateProfile,
};
