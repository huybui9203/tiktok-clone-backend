import { StatusCodes } from 'http-status-codes';
import { raw } from 'mysql2';
import db from '~/models';
import ApiError from '~/utils/ApiError';

const createVideo = async (data) => {
    try {
        const videoData = await db.Video.create(data);
        return videoData;
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
};

const getListVideos = async ({ type = 'for-you', page = 1, perPage }) => {
    try {
        const subQueries = {
            likesOfVideo: `(SELECT COUNT(Likes.user_id) FROM Likes WHERE Likes.likeable_id = Video.id AND Likes.likeable_type='video')`,
            commentsCount: `(SELECT COUNT(Comments.id) FROM Comments WHERE Comments.video_id = Video.id)`,
        };
        const [listVideos, videoCount] = await Promise.all([
            db.Video.findAll({
                include: [
                    {
                        model: db.User,
                        as: 'user',
                        attributes: {
                            exclude: [
                                'password',
                                'email',
                                'social_id',
                                'email',
                                'email_verified_at',
                                'createdAt',
                                'updatedAt',
                            ],
                        },
                    },
                ],
                attributes: {
                    include: [
                        [
                            db.sequelize.literal(subQueries.commentsCount),
                            'comments_count',
                        ],
                        [
                            db.sequelize.literal(subQueries.likesOfVideo),
                            'likes_count',
                        ],
                    ],
                },
                offset: perPage * (page - 1),
                limit: perPage,
                // raw: true,
                // nest: true,
            }),
            db.Video.count(),
        ]);
        return [listVideos, videoCount];
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
};

const getVideo = async (uuid) => {
    try {
        const subQueries = {
            likesOfVideo: `(SELECT COUNT(Likes.user_id) FROM Likes WHERE Likes.likeable_id = Video.id AND Likes.likeable_type='video')`,
            commentsCount: `(SELECT COUNT(Comments.id) FROM Comments WHERE Comments.video_id = Video.id)`,
        };
        const video = await db.Video.findOne({
            where: {
                uuid,
            },
            include: [
                {
                    model: db.User,
                    as: 'user',
                    attributes: {
                        exclude: [
                            'password',
                            'email',
                            'social_id',
                            'email',
                            'email_verified_at',
                            'createdAt',
                            'updatedAt',
                        ],
                    },
                },
            ],
            attributes: {
                include: [
                    [
                        db.sequelize.literal(subQueries.commentsCount),
                        'comments_count',
                    ],
                    [
                        db.sequelize.literal(subQueries.likesOfVideo),
                        'likes_count',
                    ],
                ],
            },
            // raw: true,
            // nest: true,
        });
        return video;
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
};

export { createVideo, getListVideos, getVideo };
