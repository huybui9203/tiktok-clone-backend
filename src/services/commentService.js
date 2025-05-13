import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { Op, where } from 'sequelize';
import { ROLE } from '~/config/roles';
import db from '~/models';
import ApiError from '~/utils/ApiError';
import { destroy } from '~/utils/customSequelizeMethods';

const createComment = async (data) => {
    const t = await db.sequelize.transaction();
    try {
        if (data.parent_id) {
            await checkCommentExist(data.parent_id);
        }
        const parentCommentIDs = !data.parent_id ? [] : data.path.split('/');
        const updateRepliesCount = (commentId) => {
            return db.Comment.increment(
                {
                    replies_count: 1,
                },
                { where: { id: commentId }, transaction: t }
            );
        };

        const [commentData] = await Promise.all([
            db.Comment.create(data, { transaction: t }),
            db.Video.increment(
                { comments_count: 1 },
                {
                    where: {
                        id: data.video_id,
                    },
                    transaction: t,
                }
            ),
            ...parentCommentIDs.map((id) => updateRepliesCount(Number(id))),
        ]);

        if (data.tags?.length) {
            const listTags = data.tags.map((tag) => {
                const { tag_name, start, end } = tag;
                return {
                    tag_name,
                    start,
                    end,
                    taggable_type: 'comment',
                    taggable_id: commentData.id,
                };
            });

            await db.Tags.bulkCreate(listTags, { transaction: t });
        }
        await t.commit();
        return commentData;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

const getComments = async (
    videoId,
    currentUserId,
    parentId = null,
    commentId,
    inclCommentId,
    page,
    perPage
) => {
    try {
        const subQueries = {
            isFollowed: `EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = user.id AND Follows.follower_id = ${currentUserId || -1})`,
            isLiked: `EXISTS (SELECT 1 FROM Likes WHERE Likes.likeable_type = 'comment' && Likes.likeable_id = Comment.id AND Likes.user_id = ${currentUserId || -1})`,
            isReported: `EXISTS (SELECT 1 FROM Reports WHERE Reports.reportable_type = 'comment' 
                        and Reports.reportable_id = Comment.id AND Reports.user_id = ${currentUserId || -1} 
                        and Reports.is_resolved = false)`,
        };

        const conditionReply = inclCommentId
            ? {
                  [Op.or]: [{ is_author_video: true }, { id: inclCommentId }],
              }
            : { is_author_video: true };

        const loadAuthorReply =
            parentId === null
                ? [
                      {
                          model: db.Comment,
                          as: 'reply_comments',
                          where: conditionReply,
                          attributes: {
                              include: [
                                  [
                                      db.sequelize.literal(subQueries.isLiked),
                                      'is_liked',
                                  ],
                                  [
                                      db.sequelize.literal(
                                          subQueries.isReported
                                      ),
                                      'is_reported',
                                  ],
                              ],
                              exclude: ['updatedAt'],
                          },

                          include: [
                              {
                                  model: db.Tags,
                                  as: 'tags',
                                  attributes: [
                                      'id',
                                      'start',
                                      'end',
                                      'tag_name',
                                  ],
                              },
                              {
                                  model: db.User,
                                  as: 'user',
                                  attributes: [
                                      'id',
                                      'username',
                                      'nickname',
                                      'avatar',
                                      //   [
                                      //       db.sequelize.literal(
                                      //           `JSON_EXTRACT(avatar, '$.sm')`
                                      //       ),
                                      //       'avatar_url',
                                      //   ],
                                      'bio',
                                      'tick',
                                      'followings_count',
                                      'followers_count',
                                      'likes_count',
                                      [
                                          db.sequelize.literal(
                                              subQueries.isFollowed
                                          ),
                                          'is_followed',
                                      ],
                                  ],
                              },
                          ],
                          required: false,
                          limit: inclCommentId ? 2 : 1,
                      },
                  ]
                : inclCommentId
                  ? [
                        {
                            model: db.Comment,
                            as: 'reply_comments',
                            where: {
                                id: inclCommentId,
                            },
                            attributes: {
                                include: [
                                    [
                                        db.sequelize.literal(
                                            subQueries.isLiked
                                        ),
                                        'is_liked',
                                    ],
                                    [
                                        db.sequelize.literal(
                                            subQueries.isReported
                                        ),
                                        'is_reported',
                                    ],
                                ],
                                exclude: ['updatedAt'],
                            },

                            include: [
                                {
                                    model: db.Tags,
                                    as: 'tags',
                                    attributes: [
                                        'id',
                                        'start',
                                        'end',
                                        'tag_name',
                                    ],
                                },
                                {
                                    model: db.User,
                                    as: 'user',
                                    attributes: [
                                        'id',
                                        'username',
                                        'nickname',
                                        'avatar',
                                        //   [
                                        //       db.sequelize.literal(
                                        //           `JSON_EXTRACT(avatar, '$.sm')`
                                        //       ),
                                        //       'avatar_url',
                                        //   ],
                                        'bio',
                                        'tick',
                                        'followings_count',
                                        'followers_count',
                                        'likes_count',
                                        [
                                            db.sequelize.literal(
                                                subQueries.isFollowed
                                            ),
                                            'is_followed',
                                        ],
                                    ],
                                },
                            ],
                            required: false,
                            limit: 1,
                        },
                    ]
                  : [];

        const whereOption = commentId
            ? {
                  id: {
                      [Op.lte]: commentId,
                  },
              }
            : {};

        const [listComments, commentCount] = await Promise.all([
            db.Comment.findAll({
                where: {
                    video_id: videoId,
                    parent_id: parentId,
                    ...whereOption,
                },
                include: [
                    {
                        model: db.Tags,
                        as: 'tags',
                        attributes: ['id', 'start', 'end', 'tag_name'],
                    },
                    ...loadAuthorReply,
                    {
                        model: db.User,
                        as: 'user',
                        attributes: [
                            'id',
                            'username',
                            'nickname',
                            'avatar',
                            // [
                            //     db.sequelize.literal(
                            //         `JSON_EXTRACT(avatar, '$.sm')`
                            //     ),
                            //     'avatar_url',
                            // ],
                            'bio',
                            'tick',
                            'followings_count',
                            'followers_count',
                            'likes_count',
                            [
                                db.sequelize.literal(subQueries.isFollowed),
                                'is_followed',
                            ],
                        ],
                    },
                ],
                attributes: {
                    include: [
                        [db.sequelize.literal(subQueries.isLiked), 'is_liked'],
                        [
                            db.sequelize.literal(subQueries.isReported),
                            'is_reported',
                        ],
                    ],

                    exclude: ['updatedAt'],
                },
                limit: perPage,
                offset: perPage * (page - 1),
                order: [['createdAt', 'DESC']],
            }),
            db.Comment.count({
                where: {
                    video_id: videoId,
                    parent_id: parentId,
                },
            }),
        ]);

        // const totalReplies = await db.Comment.sum('replies_count', {
        //     where: { video_id: videoId, parent_id: parentId },
        // });
        return {
            listComments: listComments.map((comment) => {
                const commentData = comment.toJSON();
                return {
                    ...commentData,
                    is_liked: !!commentData.is_liked,
                    is_reported: !!commentData.is_reported,
                    user: {
                        ...commentData.user,
                        is_followed: !!commentData.user?.is_followed,
                    },
                };
            }),
            commentCount,
        };
    } catch (error) {
        throw error;
    }
};

const getComment = async (commentId, currentUserId, include = []) => {
    try {
        const subQueries = {
            isFollowed: `EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = user.id AND Follows.follower_id = ${currentUserId || -1})`,
            isLiked: `EXISTS (SELECT 1 FROM Likes WHERE Likes.likeable_type = 'comment' && Likes.likeable_id = ${commentId} AND Likes.user_id = ${currentUserId || -1})`,
            isReported: `EXISTS (SELECT 1 FROM Reports WHERE Reports.reportable_type = 'comment' 
                    and Reports.reportable_id = Comment.id AND Reports.user_id = ${currentUserId || -1} 
                    and Reports.is_resolved = false)`,
        };

        const includeModels = include.map((modelName) => {
            if (modelName === 'Video') {
                return {
                    model: db.Video,
                    as: 'video',
                    attributes: [
                        'id',
                        'uuid',
                        'description',
                        'thumb',
                        'user_id',
                    ],
                };
            } else if (modelName === 'Comment') {
                return {
                    model: db.Comment,
                    as: 'reply_to',
                    attributes: ['id', 'comment', 'user_id', 'parent_id'],
                };
            }
        });

        const commentData = await db.Comment.findByPk(commentId, {
            include: [
                {
                    model: db.Tags,
                    as: 'tags',
                    attributes: ['id', 'start', 'end', 'tag_name'],
                },
                {
                    model: db.User,
                    as: 'user',
                    attributes: [
                        'id',
                        'username',
                        'nickname',
                        'avatar',
                        'bio',
                        'tick',
                        'followings_count',
                        'followers_count',
                        'likes_count',
                        [
                            db.sequelize.literal(subQueries.isFollowed),
                            'is_followed',
                        ],
                    ],
                },

                ...includeModels,
            ],
            attributes: {
                include: [
                    [db.sequelize.literal(subQueries.isLiked), 'is_liked'],
                    [
                        db.sequelize.literal(subQueries.isReported),
                        'is_reported',
                    ],
                ],
                exclude: ['updatedAt'],
            },
        });
        if (!commentData) {
            throw new ApiError(
                StatusCodes.NOT_FOUND,
                `This resource doesn't exist`
            );
        }

        const newCommentData = commentData.toJSON();
        return {
            ...newCommentData,
            is_liked: !!newCommentData.is_liked,
            is_reported: !!newCommentData.is_reported,
            user: {
                ...newCommentData.user,
                is_followed: !!newCommentData.user?.is_followed,
            },
        };
    } catch (error) {
        throw error;
    }
};

const updateComment = async (id, comment, tags, currentUserId) => {
    const t = await db.sequelize.transaction();
    try {
        const currentComment = await findCommentOfUser(id, currentUserId);

        const listTags = tags?.map((tag) => ({
            ...tag,
            taggable_type: 'comment',
            taggable_id: id,
        }));

        await Promise.all([
            db.Comment.update(
                { comment: comment, edited_at: new Date() },
                { where: { id }, transaction: t }
            ),
            currentComment.comment.includes('@') &&
                db.Tags.destroy({
                    where: { taggable_type: 'comment', taggable_id: id },
                    transaction: t,
                }),
            tags?.length > 0 &&
                db.Tags.bulkCreate(listTags, { transaction: t }),
        ]);
        await t.commit();
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

const findCommentOfUser = async (id, currentUserId, role = ROLE.user) => {
    const commentData = await db.Comment.findByPk(id);
    if (!commentData) {
        throw new ApiError(
            StatusCodes.NOT_FOUND,
            `This resource doesn't exist`
        );
    }
    if (role === ROLE.user && commentData.user_id !== currentUserId) {
        throw new ApiError(
            StatusCodes.FORBIDDEN,
            `You don't have permission to access this resource`
        );
    }
    return commentData;
};

const checkCommentExist = async (commentId) => {
    const currentComment = await db.Comment.findByPk(commentId);
    if (!currentComment) {
        throw new ApiError(
            StatusCodes.NOT_FOUND,
            `This resource doesn't exist`
        );
    }
};
const deleteComment = async (id, currentUserId, role = ROLE.user) => {
    const t = await db.sequelize.transaction();
    try {
        const currentComment = await findCommentOfUser(id, currentUserId, role);

        const { path, video_id, likes_count, replies_count, comment } =
            currentComment;

        const parentCommentIDs = !path ? [] : path.split('/');

        const updateRepliesCount = (commentId) => {
            return db.Comment.decrement(
                {
                    replies_count: 1 + replies_count,
                },
                { where: { id: commentId }, transaction: t }
            );
        };

        await Promise.all([
            db.Comment.destroy({
                where: { id },
                transaction: t,
            }),
            comment.includes('@') &&
                db.Tags.destroy({
                    where: {
                        taggable_type: 'comment',
                        taggable_id: id,
                    },
                    transaction: t,
                }),
            likes_count > 0 &&
                db.Like.destroy({
                    where: {
                        likeable_type: 'comment',
                        likeable_id: id,
                    },
                    transaction: t,
                }),
            db.Video.decrement(
                { comments_count: 1 + replies_count },
                {
                    where: {
                        id: video_id,
                    },
                    transaction: t,
                }
            ),
            ...parentCommentIDs.map((id) => updateRepliesCount(Number(id))),
        ]);
        await t.commit();
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

const likeComment = async (commentId, userId) => {
    const t = await db.sequelize.transaction();
    try {
        await checkCommentExist(commentId);
        await Promise.all([
            db.Comment.increment(
                { likes_count: 1 },
                {
                    where: {
                        id: commentId,
                    },
                    transaction: t,
                }
            ),
            db.Like.create(
                {
                    user_id: userId,
                    likeable_id: commentId,
                    likeable_type: 'comment',
                },
                { transaction: t }
            ),
        ]);
        await t.commit();
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

const unLikeComment = async (commentId, userId) => {
    const t = await db.sequelize.transaction();
    try {
        await checkCommentExist(commentId);
        await Promise.all([
            destroy(db.Like, {
                where: {
                    likeable_type: 'comment',
                    likeable_id: commentId,
                    user_id: userId,
                },
                transaction: t,
            }),
            db.Comment.decrement(
                { likes_count: 1 },
                {
                    where: {
                        id: commentId,
                    },
                    transaction: t,
                }
            ),
        ]);
        await t.commit();
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export {
    createComment,
    getComments,
    getComment,
    updateComment,
    deleteComment,
    likeComment,
    unLikeComment,
};
