import { StatusCodes } from 'http-status-codes';
import fs from 'fs';
import * as userService from '~/services/admin/userService';
import { destroyImage, uploadImageToCloud } from '~/utils/uploadFile';
import { ROLE } from '~/config/roles';
import redisClient from '~/config/connectionRedis';

const createUser = async (req, res, next) => {
    try {
        const currentUserRole = req.currentUser?.role;
        const { email, password, role } = req.body;
        const avatarUrl = req.filePath;
        const data = { email, password };
        if (currentUserRole === ROLE.superAdmin) {
            data.role = role;
        }
        if (avatarUrl) {
            const uploadImage = async () => {
                const [error, image] = await uploadImageToCloud(avatarUrl);
                fs.unlinkSync(avatarUrl);
                if (error) {
                    throw new ApiError(
                        StatusCodes.INTERNAL_SERVER_ERROR,
                        error.message
                    );
                }
                return {
                    public_id: image.public_id,
                    lg: image.secure_url,
                    sm: image.eager[0].secure_url,
                };
            };

            // const destroyOldImage = async () => {
            //     if (publicId) {
            //         await destroyImage(publicId);
            //     }
            // };

            const avatar = await uploadImage();
            data.avatar = avatar;
        }

        await userService.createUser(data);
        res.status(StatusCodes.CREATED).json({
            message: 'success',
        });
    } catch (error) {
        next(error);
    }
};

const updateUser = async (req, res, next) => {
    try {
        const currentUserRole = req.currentUser?.role;
        const { id: userId } = req.params;
        const {
            username,
            email,
            password,
            role,
            status,
            suspend_expire,
            publicAvtId,
            isVerified,
        } = req.body;
        const avatarUrl = req.filePath;
        const data = { username, email, password, tick: isVerified };

        if (currentUserRole === ROLE.superAdmin) {
            data.role = role;
        }

        if (avatarUrl) {
            const uploadImage = async () => {
                const [error, image] = await uploadImageToCloud(avatarUrl);
                fs.unlinkSync(avatarUrl);
                if (error) {
                    throw new ApiError(
                        StatusCodes.INTERNAL_SERVER_ERROR,
                        error.message
                    );
                }
                return {
                    public_id: image.public_id,
                    lg: image.secure_url,
                    sm: image.eager[0].secure_url,
                };
            };

            const destroyOldImage = async () => {
                if (publicAvtId) {
                    await destroyImage(publicAvtId);
                }
            };

            const [avatar] = await Promise.all([
                uploadImage(),
                destroyOldImage(),
            ]);
            data.avatar = avatar;
        }

        if (status) {
            data.status = status;
        }

        await userService.updateUser(userId, data);

        if (suspend_expire) {
            await redisClient.set(`user_suspended:${userId}`, suspend_expire);
            await redisClient.expire(
                `user_suspended:${userId}`,
                suspend_expire
            );
        }
        if (status && status !== 'Suspended') {
            await redisClient.del(`user_suspended:${userId}`);
        }
        res.status(StatusCodes.OK).json({
            message: 'success',
        });
    } catch (error) {
        next(error);
    }
};

const getListUsers = async (req, res, next) => {
    try {
        const role = req.currentUser?.role;
        const {
            page,
            sortBy,
            sortType,
            q: searchStr,
            status,
            role: filterRole,
        } = req.query;
        const perPage = 5;
        let allowRoles;
        if (role === ROLE.admin) {
            allowRoles = ROLE.user;
        } else if (role === ROLE.superAdmin) {
            allowRoles = [ROLE.admin, ROLE.user];
        }

        const filter = {};
        if (status) {
            filter.status = status;
        }
        if (role === ROLE.superAdmin && filterRole) {
            filter.role = filterRole?.toLowerCase();
        }
        const { listUsers, count } = await userService.getListUsers(
            page,
            perPage,
            sortBy,
            sortType,
            searchStr,
            filter,
            allowRoles
        );
        res.status(StatusCodes.OK).json({
            data: listUsers,
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

export { createUser, getListUsers, updateUser };
