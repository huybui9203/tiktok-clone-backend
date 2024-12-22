import { raw } from 'mysql2';

const { StatusCodes } = require('http-status-codes');
const { where, Op } = require('sequelize');
const { default: db } = require('~/models');
const { default: ApiError } = require('~/utils/ApiError');

const createNew = async (videoId, data) => {
    try {
        const commentData = await db.Comment.create(data, {
            where: {
                video_id: videoId,
            },
        });
        return commentData;
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
};

const getComments = async (videoId, currentUserId, parentId = null) => {
    try {
        const subQueries = {
            followersCount: `(SELECT COUNT(*) FROM Follows WHERE Follows.following_id = user.id)`,
            followingsCount: `(SELECT COUNT(*) FROM Follows WHERE Follows.follower_id = user.id)`,
            isFollowed: `EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = user.id AND Follows.follower_id = ${currentUserId || -1})`,
            totalLikes: `(SELECT COUNT(*) FROM Likes WHERE Likes.likeable_type = 'video' && owner_id = user.id)`,
        };
        const [listComments, commentCount] = await Promise.all([
            db.Comment.findAll({
                where: {
                    video_id: videoId,
                    parent_id: parentId,
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
                            include: [
                                [
                                    db.sequelize.literal(
                                        subQueries.followersCount
                                    ),
                                    'followers_count',
                                ],
                                [
                                    db.sequelize.literal(
                                        subQueries.followingsCount
                                    ),
                                    'followings_count',
                                ],
                                [
                                    db.sequelize.literal(subQueries.isFollowed),
                                    'is_followed',
                                ],
                                [
                                    db.sequelize.literal(subQueries.totalLikes),
                                    'likes_count',
                                ],
                            ],
                        },
                    },

                    // {
                    //     model: db.Comment,
                    //     as: 'reply_comments',
                    //     attributes: [],
                    // },
                ],
                // attributes: {
                //     include: [
                //         // [
                //         //     db.sequelize.fn('COUNT', db.sequelize.col('reply_comments.id')),
                //         //     'replies_count',
                //         // ],
                //         [
                //             db.sequelize.literal(
                //                 subQueries.repliesCount
                //             ),
                //             'replies_count',
                //         ],
                //     ],
                // },
                // group: ['id'],
            }),
            db.Comment.count({
                where: {
                    video_id: videoId,
                },
            }),
        ]);
        const data = listComments.map(async (comment) => {
            const commentData = comment.toJSON()
            const repliesCount = await db.Comment.count({
                video_id: videoId,
                where: {
                    [Op.or]: [
                        { path: { [Op.like]: `%,${commentData.id},%` } },
                        { path: { [Op.like]: `${commentData.id},%` } },
                        { path: { [Op.like]: `%,${commentData.id}` } },
                        { path: commentData.id.toString() },
                    ],
                },
            });

            return {
                ...commentData,
                replies_count: repliesCount
            }
        });
        return [data, commentCount];
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
};

const getComment = async (commentId, currentUserId) => {
    try {
        const subQueries = {
            followersCount: `(SELECT COUNT(*) FROM Follows WHERE Follows.following_id = user.id)`,
            followingsCount: `(SELECT COUNT(*) FROM Follows WHERE Follows.follower_id = user.id)`,
            isFollowed: `EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = user.id AND Follows.follower_id = ${currentUserId || -1})`,
            totalLikes: `(SELECT COUNT(*) FROM Likes WHERE Likes.likeable_type = 'video' && owner_id = user.id)`,
        };
        const commentData = await db.Comment.findByPk(commentId, {
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
                        include: [
                            [
                                db.sequelize.literal(subQueries.followersCount),
                                'followers_count',
                            ],
                            [
                                db.sequelize.literal(
                                    subQueries.followingsCount
                                ),
                                'followings_count',
                            ],
                            [
                                db.sequelize.literal(subQueries.isFollowed),
                                'is_followed',
                            ],
                            [
                                db.sequelize.literal(subQueries.totalLikes),
                                'likes_count',
                            ],
                        ],
                    },
                },
            ],
        });
        return commentData;
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
};

export { createNew, getComments, getComment };
