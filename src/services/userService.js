import bcrypt from 'bcrypt';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { raw } from 'mysql2';
import { where } from 'sequelize';
import db from '~/models';
import ApiError from '~/utils/ApiError';
import { SALT_ROUNDS } from '~/utils/constants';
import generateUniqueUsername from '~/utils/generateUniqueUsername';

const createUser = async ({ month, day, year, email, password }) => {
    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const username = generateUniqueUsername([
            email.slice(0, email.indexOf('@')),
        ]);
        const userData = await db.User.create({
            date_of_birth: new Date(year, month - 1, day),
            username,
            nickname: username,
            email,
            password: hashedPassword,
            email_verified_at: Date.now(),
        });
        return userData;
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
};

const updateUserById = async (userId, updateBody) => {
    try {
        const data = { ...updateBody };
        let hashedPassword;
        const { newPassword } = updateBody;
        if (newPassword) {
            hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
            data.password = hashedPassword;
        }

        await db.User.update(data, {
            where: {
                id: userId,
            },
        });
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
};

const getUserbyEmail = async (email) => {
    try {
        const user = await db.User.findOne({ where: { email }, raw: true });
        return user;
    } catch (error) {
        throw new ApiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            ReasonPhrases.INTERNAL_SERVER_ERROR
        );
    }
};

const getUserById = async (userId) => {
    try {
        const user = await db.User.findByPk(userId, { raw: true });
        return user;
    } catch (error) {
        throw new ApiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            ReasonPhrases.INTERNAL_SERVER_ERROR
        );
    }
};

const getProfileByUsername = async (username, id, page = 1, perPage = 5) => {
    try {
        const subQueries = {
            followersCount: `(SELECT COUNT(*) FROM Follows WHERE Follows.following_id = User.id)`,
            followingsCount: `(SELECT COUNT(*) FROM Follows WHERE Follows.follower_id = User.id)`,
            isFollowed: `EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = User.id AND Follows.follower_id = ${id || -1})`,
            totalLikes: `(SELECT COUNT(*) FROM Likes WHERE Likes.likeable_type = 'video' && owner_id = User.id)`,
            likesOfVideo: `(SELECT COUNT(*) FROM Likes WHERE Likes.likeable_id = Video.id AND Likes.likeable_type='video')`,
            videosCount: `(SELECT COUNT(*) FROM Videos WHERE Videos.user_id = User.id)`,
        };

        const user = await db.User.findOne({
            attributes: [
                'id',
                'username',
                'nickname',
                'avatar',
                'tick',
                'bio',
                'facebook_url',
                'youtube_url',
                'twitter_url',
                'instagram_url',
                [
                    db.sequelize.literal(subQueries.followersCount),
                    'followers_count',
                ],
                [
                    db.sequelize.literal(subQueries.followingsCount),
                    'followings_count',
                ],
                [db.sequelize.literal(subQueries.isFollowed), 'is_followed'],
                [db.sequelize.literal(subQueries.totalLikes), 'likes_count'],
                [db.sequelize.literal(subQueries.videosCount), 'videos_count'],
            ],

            include: [
                {
                    model: db.Video,
                    as: 'videos',
                    attributes: {
                        include: [
                            [
                                db.sequelize.literal(subQueries.likesOfVideo),
                                'likes_count',
                            ],
                        ],
                    },
                    offset: perPage * (page - 1),
                    limit: perPage,
                },
            ],

            where: {
                username,
            },
        });

        if (!user) {
            throw new ApiError(StatusCodes.NOT_FOUND, ReasonPhrases.NOT_FOUND);
        }

        const isFollowed = user.is_followed === 1 ? true : false;
        return { ...user.toJSON(), is_followed: isFollowed };
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
};

const updateProfile = async (userId, data) => {
    try {
        await db.User.update(data, {
            where: {
                id: userId,
            },
        });
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
};

const getUserByUsername = async (username) => {
    const user = await db.User.findOne({
        where: {
            username,
        },
    }).catch((error) => {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    });
    return user;
};

export {
    createUser,
    getUserbyEmail,
    updateUserById,
    getUserById,
    getProfileByUsername,
    getUserByUsername,
    updateProfile,
};
