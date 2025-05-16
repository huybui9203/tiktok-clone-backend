import { StatusCodes } from 'http-status-codes';
import { raw } from 'mysql2';
import { Op, QueryTypes, where } from 'sequelize';
import { ROLE } from '~/config/roles';
import db from '~/models';
import ApiError from '~/utils/ApiError';
import { destroy } from '~/utils/customSequelizeMethods';

const createVideo = async (data) => {
    try {
        const videoData = await db.Video.create(data);
        return videoData;
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
};

const getListPosts = async ({ page = 1, perPage, currentUserId }) => {
    let conditions = `WHERE (Video.user_id = ${currentUserId || -1} OR Video.viewable = 'public'
                OR (Video.viewable = 'friends' AND exists (select * from Follows as f1 join Follows as f2
                on f1.follower_id = f2.following_id and f1.following_id = f2.follower_id
                where f1.follower_id = ${currentUserId || -1} and f1.following_id = Video.user_id)))`;
    if (!currentUserId) {
        conditions = `WHERE Video.viewable = 'public'`;
    }
    const queries = {
        getListPosts: `SELECT Video.post_id, Video.id, Video.uuid, Video.user_id, Video.thumb,
                Video.file_url, Video.description, Video.music, Video.viewable, Video.allows,
                Video.published_at, Video.meta, Video.likes_count, Video.comments_count,
                Video.shares_count, Video.views_count, Video.favorites_count, Video.createdAt,
                Video.updatedAt, Video.shared_by, Video.posted_at,
                EXISTS (SELECT 1 FROM Likes WHERE Likes.likeable_type = 'video'
                and Likes.likeable_id = Video.id AND Likes.user_id = ${currentUserId || -1}) AS is_liked,
                EXISTS (SELECT 1 FROM Favorites WHERE Favorites.video_id = Video.id
                AND Favorites.user_id = ${currentUserId || -1}) AS is_add_to_favorite,
                EXISTS (select 1 from Shares as share where share.user_id = ${currentUserId || -1}
                and share.video_id = Video.id and share.method = 'repost') AS is_reposted,
                (select json_object('last_view_at', DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s'),
                'view_number', view_number) as last_view from Views as v where v.user_id = ${currentUserId || -1}
                and v.video_id = Video.id order by createdAt desc limit 1) AS last_view,
                user.id AS 'user.id', user.first_name AS 'user.first_name', user.last_name AS 'user.last_name',
                user.username AS 'user.username', user.nickname AS 'user.nickname', user.avatar AS 'user.avatar',
                user.gender AS 'user.gender', user.bio AS 'user.bio', user.social_type AS 'user.social_type',
                user.tick AS 'user.tick', user.date_of_birth AS 'user.date_of_birth',
                user.website_url AS 'user.website_url', user.facebook_url AS 'user.facebook_url',
                user.youtube_url AS 'user.youtube_url', user.twitter_url AS 'user.twitter_url',
                user.instagram_url AS 'user.instagram_url', user.followings_count AS 'user.followings_count',
                user.followers_count AS 'user.followers_count', user.likes_count AS 'user.likes_count',
                user.videos_count AS 'user.videos_count', user.nickname_updated_at AS 'user.nickname_updated_at',
                EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = user.id AND Follows.follower_id = ${currentUserId || -1}) AS 'user.is_followed'
                FROM (select concat('video:', v.id) as post_id, v.*, null as shared_by,
                v.createdAt as posted_at from Videos as v union all select concat('share:', s.id) , v.*,
                json_object('id', us.id, 'nickname', us.nickname, 'username', us.username, 'avatar_url',
                json_extract(us.avatar, '$.sm'), 'tick', us.tick, 'caption', s.caption),
                s.createdAt from Shares as s join Videos as v on s.video_id = v.id and method = 'repost'
                join Users as us on s.user_id = us.id) AS Video LEFT OUTER JOIN Users AS user
                ON Video.user_id = user.id ${conditions}
                order by Video.posted_at DESC, Video.likes_count DESC, Video.views_count DESC,
                Video.comments_count DESC, Video.shares_count DESC, Video.favorites_count DESC
                LIMIT ${perPage} OFFSET ${perPage * (page - 1)}`,
        count: `SELECT count(Video.id) AS count FROM
                (select v.* from Videos as v union all select  v.* from Shares as s
                join Videos as v on s.video_id = v.id and method = 'repost'
                join Users as us on s.user_id = us.id) AS Video
                ${conditions}`,
    };
    const [listVideos, videoCount] = await Promise.all([
        db.sequelize.query(queries.getListPosts, {
            type: QueryTypes.SELECT,
            nest: true,
        }),
        db.sequelize.query(queries.count, {
            type: QueryTypes.SELECT,
        }),
    ]);
    return { listVideos, videoCount: videoCount[0]?.count };
};

const searchVideo = async (keyword, limit, currentUserId) => {
    const listVideos = await db.Video.findAll({
        where: {
            description: {
                [Op.substring]: keyword,
            },
            status: 'approved',
            [Op.or]: [
                { user_id: currentUserId },
                { viewable: 'public' },
                {
                    [Op.and]: [
                        { viewable: { [Op.eq]: 'friends' } },
                        db.sequelize.literal(
                            `exists (select * from Follows as f1 join Follows as f2 
                            on f1.follower_id = f2.following_id and f1.following_id = f2.follower_id
                            where f1.follower_id = ${currentUserId} and f1.following_id = Video.user_id)`
                        ),
                    ],
                },
            ],
        },
        include: [
            { model: db.User, as: 'user', attributes: ['id', 'username'] },
        ],
        attributes: ['id', 'uuid', 'description', 'thumb'],
        limit,
        order: [
            ['views_count', 'DESC'],
            ['likes_count', 'DESC'],
            ['comments_count', 'DESC'],
            ['shares_count', 'DESC'],
        ],
    });

    return listVideos;
};

const getListVideos = async ({
    type = 'for-you',
    categoryId,
    keyword,
    page = 1,
    perPage,
    currentUserId,
}) => {
    try {
        let moreCondition = {};
        if (categoryId && categoryId !== 0) {
            //categoryId = 0 ~ 'All'
            moreCondition = { category_id: categoryId };
        } else if (keyword) {
            moreCondition = {
                description: {
                    [Op.substring]: keyword,
                },
            };
        }

        const conditions = currentUserId
            ? {
                  ...moreCondition,
                  status: 'approved',
                  [Op.or]: [
                      { user_id: currentUserId },
                      { viewable: 'public' },
                      {
                          [Op.and]: [
                              { viewable: { [Op.eq]: 'friends' } },
                              db.sequelize.literal(
                                  // `EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = User.id AND Follows.follower_id = ${currentUserId})`
                                  `exists (select * from Follows as f1 join Follows as f2 
                            on f1.follower_id = f2.following_id and f1.following_id = f2.follower_id
                            where f1.follower_id = ${currentUserId} and f1.following_id = Video.user_id)`
                              ),
                          ],
                      },
                  ],
              }
            : { ...moreCondition, viewable: 'public' };
        const subQueries = {
            isFollowed: `EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = user.id AND Follows.follower_id = ${currentUserId || -1})`,
            isLiked: `EXISTS (SELECT 1 FROM Likes WHERE Likes.likeable_type = 'video' && Likes.likeable_id = Video.id AND Likes.user_id = ${currentUserId || -1})`,
            isAddToFavorite: `EXISTS (SELECT 1 FROM Favorites WHERE Favorites.video_id = Video.id AND Favorites.user_id = ${currentUserId || -1})`,
            isReposted: `EXISTS (select 1 from Shares as share where share.user_id = ${currentUserId || -1} and share.video_id = Video.id and share.method = 'repost')`,
            lastTimeView: `(select json_object('last_view_at', DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s'), 'view_number', view_number) as last_view 
                        from Views as v where v.user_id = ${currentUserId || -1} and v.video_id = Video.id order by createdAt desc limit 1)`,
            last_shared_at: `(select s.createdAt from Shares as s where s.video_id = Video.id and s.method = 'repost' 
                        and (s.user_id = ${currentUserId || -1} or exists (select 1 from Follows where Follows.follower_id = ${currentUserId || -1} and Follows.following_id = s.user_id))
                        order by s.createdAt desc limit 1)`,
            reposted_count: `(select count(s.id) from Shares as s where s.video_id = Video.id and s.method = 'repost' 
                        and (s.user_id = ${currentUserId || -1} or exists (select 1 from Follows where Follows.follower_id = ${currentUserId || -1} and Follows.following_id = s.user_id)))`,
            isReported: `EXISTS (SELECT 1 FROM Reports WHERE Reports.reportable_type = 'video' 
                        and Reports.reportable_id = Video.id AND Reports.user_id = ${currentUserId || -1} and Reports.is_resolved = false)`,
        };
        const { rows: listVideos, count: videoCount } =
            await db.Video.findAndCountAll({
                where: conditions,
                include: [
                    {
                        model: db.User,
                        as: 'user',
                        attributes: {
                            exclude: [
                                'password',
                                'email',
                                'social_id',
                                'email_verified_at',
                                'createdAt',
                                'updatedAt',
                                'nickname_updated_at',
                                'website_url',
                                'facebook_url',
                                'youtube_url',
                                'twitter_url',
                                'instagram_url',
                                'date_of_birth',
                                'social_type',
                            ],
                            include: [
                                [
                                    db.sequelize.literal(subQueries.isFollowed),
                                    'is_followed',
                                ],
                            ],
                        },
                    },

                    {
                        model: db.Share,
                        as: 'sharers',
                        required: false,
                        where: {
                            [Op.and]: [
                                { method: 'repost' },
                                {
                                    [Op.or]: [
                                        { user_id: currentUserId || -1 },
                                        db.sequelize.literal(
                                            `exists (select 1 from Follows where Follows.follower_id = ${currentUserId || -1} and Follows.following_id = Share.user_id)`
                                        ),
                                    ],
                                },
                            ],
                        },

                        attributes: ['id', 'caption', 'createdAt', 'user_id'],
                        include: [
                            {
                                model: db.User,
                                as: 'user',
                                attributes: [
                                    'id',
                                    'nickname',
                                    'username',
                                    'tick',
                                    [
                                        db.sequelize.literal(
                                            `JSON_EXTRACT(avatar, '$.sm')`
                                        ),
                                        'avatar_url',
                                    ],
                                ],
                            },
                        ],
                        order: [['createdAt', 'DESC']],
                        separate: true,
                        limit: 3,
                    },
                ],
                attributes: {
                    include: [
                        [db.sequelize.literal(subQueries.isLiked), 'is_liked'],
                        [
                            db.sequelize.literal(subQueries.isAddToFavorite),
                            'is_add_to_favorite',
                        ],
                        [
                            db.sequelize.literal(subQueries.isReposted),
                            'is_reposted',
                        ],
                        [
                            db.sequelize.literal(subQueries.lastTimeView),
                            'last_view',
                        ],
                        [
                            db.sequelize.literal(subQueries.last_shared_at),
                            'last_shared_at',
                        ],
                        [
                            db.sequelize.literal(subQueries.reposted_count),
                            'reposted_count',
                        ],
                        [
                            db.sequelize.literal(subQueries.isReported),
                            'is_reported',
                        ],
                    ],
                },
                offset: perPage * (page - 1),
                limit: perPage,
                // order by Video.posted_at DESC, Video.likes_count DESC, Video.views_count DESC,
                // Video.comments_count DESC, Video.shares_count DESC, Video.favorites_count DESC
                order: [
                    ['last_shared_at', 'DESC'],
                    ['likes_count', 'DESC'],
                    ['views_count', 'DESC'],
                    ['comments_count', 'DESC'],
                    ['shares_count', 'DESC'],
                    ['favorites_count', 'DESC'],
                ],
            });
        return { listVideos, videoCount };
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
};

const checkVideoWithUsername = async (username, uuid) => {
    const author = await db.User.findOne({
        where: { username },
    });
    if (!author) {
        throw new ApiError(StatusCodes.NOT_FOUND, `Video's author not found`);
    }
    const video = await db.Video.findOne({
        where: {
            uuid,
            user_id: author.id,
        },
    });
    if (!video) {
        throw new ApiError(StatusCodes.NOT_FOUND, `Video not found`);
    }
};

const getVideoWithCheckPrivacy = async (uuid, currentUserId) => {
    const subQueries = {
        isFollowed: `EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = user.id AND Follows.follower_id = ${currentUserId || -1})`,
        isLiked: `EXISTS (SELECT 1 FROM Likes WHERE Likes.likeable_type = 'video' && Likes.likeable_id = Video.id AND Likes.user_id = ${currentUserId || -1})`,
        isAddToFavorite: `EXISTS (SELECT 1 FROM Favorites WHERE Favorites.video_id = Video.id AND Favorites.user_id = ${currentUserId || -1})`,
        isReposted: `EXISTS (select 1 from Shares as share where share.user_id = ${currentUserId || -1} and share.video_id = Video.id and share.method = 'repost')`,
        lastTimeView: `(select json_object('last_view_at', DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s'), 'view_number', view_number) as last_view from Views as v 
                    where v.user_id = ${currentUserId || -1} and v.video_id = Video.id order by createdAt desc limit 1)`,
        last_shared_at: `(select s.createdAt from Shares as s where s.video_id = Video.id and s.method = 'repost' 
                    and (s.user_id = ${currentUserId || -1} or exists (select 1 from Follows 
                    where Follows.follower_id = ${currentUserId || -1} and Follows.following_id = s.user_id))
                    order by s.createdAt desc limit 1)`,
        reposted_count: `(select count(s.id) from Shares as s where s.video_id = Video.id and s.method = 'repost' 
                    and (s.user_id = ${currentUserId || -1} or exists (select 1 from Follows 
                    where Follows.follower_id = ${currentUserId || -1} and Follows.following_id = s.user_id)))`,
        isReported: `EXISTS (SELECT 1 FROM Reports WHERE Reports.reportable_type = 'video' 
                    and Reports.reportable_id = Video.id AND Reports.user_id = ${currentUserId || -1} and Reports.is_resolved = false)`,
    };
    const video = await db.Video.findOne({
        where: {
            [Op.and]: [
                { uuid },
                {
                    [Op.or]: [
                        { user_id: currentUserId },
                        { viewable: 'public', status: 'approved' },
                        {
                            [Op.and]: [
                                {
                                    viewable: { [Op.eq]: 'friends' },
                                    status: 'approved',
                                },
                                db.sequelize.literal(
                                    `exists (select * from Follows as f1 join Follows as f2 
                                    on f1.follower_id = f2.following_id and f1.following_id = f2.follower_id
                                    where f1.follower_id = ${currentUserId} and f1.following_id = Video.user_id)`
                                ),
                            ],
                        },
                    ],
                },
            ],
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
                        'email_verified_at',
                        'createdAt',
                        'updatedAt',
                        'nickname_updated_at',
                        'website_url',
                        'facebook_url',
                        'youtube_url',
                        'twitter_url',
                        'instagram_url',
                        'date_of_birth',
                        'social_type',
                    ],
                    include: [
                        [
                            db.sequelize.literal(subQueries.isFollowed),
                            'is_followed',
                        ],
                    ],
                },
            },

            {
                model: db.Share,
                as: 'sharers',
                required: false,
                where: {
                    [Op.and]: [
                        { method: 'repost' },
                        {
                            [Op.or]: [
                                { user_id: currentUserId || -1 },
                                db.sequelize.literal(
                                    `exists (select 1 from Follows where Follows.follower_id = ${currentUserId || -1} and Follows.following_id = Share.user_id)`
                                ),
                            ],
                        },
                    ],
                },

                attributes: ['id', 'caption', 'createdAt', 'user_id'],
                include: [
                    {
                        model: db.User,
                        as: 'user',
                        attributes: [
                            'id',
                            'nickname',
                            'username',
                            'tick',
                            [
                                db.sequelize.literal(
                                    `JSON_EXTRACT(avatar, '$.sm')`
                                ),
                                'avatar_url',
                            ],
                        ],
                    },
                ],
                order: [['createdAt', 'DESC']],
                separate: true,
                limit: 3,
            },
        ],
        attributes: {
            include: [
                [db.sequelize.literal(subQueries.isLiked), 'is_liked'],
                [
                    db.sequelize.literal(subQueries.isAddToFavorite),
                    'is_add_to_favorite',
                ],
                [db.sequelize.literal(subQueries.isReposted), 'is_reposted'],
                [db.sequelize.literal(subQueries.lastTimeView), 'last_view'],
                [
                    db.sequelize.literal(subQueries.last_shared_at),
                    'last_shared_at',
                ],
                [
                    db.sequelize.literal(subQueries.reposted_count),
                    'reposted_count',
                ],
                [db.sequelize.literal(subQueries.isReported), 'is_reported'],
            ],
        },
    });

    if (!video) {
        throw new ApiError(
            StatusCodes.FORBIDDEN,
            `You don't have permission to access this resource`
        );
    }

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
};

const getVideo = async ({ uuid, id }, currentUserId) => {
    //this function is used at server
    const subQueries = {
        isFollowed: `EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = user.id AND Follows.follower_id = ${currentUserId || -1})`,
        isLiked: `EXISTS (SELECT 1 FROM Likes WHERE Likes.likeable_type = 'video' && Likes.likeable_id = Video.id AND Likes.user_id = ${currentUserId || -1})`,
        isAddToFavorite: `EXISTS (SELECT 1 FROM Favorites WHERE Favorites.video_id = Video.id AND Favorites.user_id = ${currentUserId || -1})`,
        isReposted: `EXISTS (select 1 from Shares as share where share.user_id = ${currentUserId || -1} and share.video_id = Video.id and share.method = 'repost')`,
        lastTimeView: `(select json_object('last_view_at', DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s'), 
                    'view_number', view_number) as last_view from Views as v 
                    where v.user_id = ${currentUserId || -1} and v.video_id = Video.id order by createdAt desc limit 1)`,
        last_shared_at: `(select s.createdAt from Shares as s where s.video_id = Video.id and s.method = 'repost' 
                    and (s.user_id = ${currentUserId || -1} or exists (select 1 from Follows 
                    where Follows.follower_id = ${currentUserId || -1} and Follows.following_id = s.user_id))
                    order by s.createdAt desc limit 1)`,
        reposted_count: `(select count(s.id) from Shares as s where s.video_id = Video.id and s.method = 'repost' 
                    and (s.user_id = ${currentUserId || -1} or exists (select 1 from Follows 
                    where Follows.follower_id = ${currentUserId || -1} and Follows.following_id = s.user_id)))`,
        isReported: `EXISTS (SELECT 1 FROM Reports WHERE Reports.reportable_type = 'video' 
                    and Reports.reportable_id = Video.id AND Reports.user_id = ${currentUserId || -1} and Reports.is_resolved = false)`,
    };
    const condition = uuid ? { uuid } : { id };
    const video = await db.Video.findOne({
        where: {
            ...condition,
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
                        'email_verified_at',
                        'createdAt',
                        'updatedAt',
                        'nickname_updated_at',
                        'website_url',
                        'facebook_url',
                        'youtube_url',
                        'twitter_url',
                        'instagram_url',
                        'date_of_birth',
                        'social_type',
                    ],
                    include: [
                        [
                            db.sequelize.literal(subQueries.isFollowed),
                            'is_followed',
                        ],
                    ],
                },
            },
            {
                model: db.Share,
                as: 'sharers',
                required: false,
                where: {
                    [Op.and]: [
                        { method: 'repost' },
                        {
                            [Op.or]: [
                                { user_id: currentUserId || -1 },
                                db.sequelize.literal(
                                    `exists (select 1 from Follows where Follows.follower_id = ${currentUserId || -1} and Follows.following_id = Share.user_id)`
                                ),
                            ],
                        },
                    ],
                },

                attributes: ['id', 'caption', 'createdAt', 'user_id'],
                include: [
                    {
                        model: db.User,
                        as: 'user',
                        attributes: [
                            'id',
                            'nickname',
                            'username',
                            'tick',
                            [
                                db.sequelize.literal(
                                    `JSON_EXTRACT(avatar, '$.sm')`
                                ),
                                'avatar_url',
                            ],
                        ],
                    },
                ],
                order: [['createdAt', 'DESC']],
                separate: true,
                limit: 3,
            },
        ],
        attributes: {
            include: [
                [db.sequelize.literal(subQueries.isLiked), 'is_liked'],
                [
                    db.sequelize.literal(subQueries.isAddToFavorite),
                    'is_add_to_favorite',
                ],
                [db.sequelize.literal(subQueries.isReposted), 'is_reposted'],
                [db.sequelize.literal(subQueries.lastTimeView), 'last_view'],
                [
                    db.sequelize.literal(subQueries.last_shared_at),
                    'last_shared_at',
                ],
                [
                    db.sequelize.literal(subQueries.reposted_count),
                    'reposted_count',
                ],
                [db.sequelize.literal(subQueries.isReported), 'is_reported'],
            ],
        },
    });

    if (!video) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Video not found');
    }

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
};

const checkVideoExist = async (videoId) => {
    return await db.Video.findByPk(videoId);
};

const likeVideo = async (data) => {
    //check video id exists
    const videoData = await checkVideoExist(data.likeable_id);
    if (!videoData) {
        throw new ApiError(StatusCodes.NOT_FOUND, `video doesn't exist`);
    }

    const t = await db.sequelize.transaction();
    try {
        const updateVideoLikesCount = (videoId) => {
            return db.Video.increment(
                {
                    likes_count: 1,
                },
                { where: { id: videoId }, transaction: t }
            );
        };

        const updateUserLikesCount = (userId) => {
            return db.User.increment(
                {
                    likes_count: 1,
                },
                { where: { id: userId }, transaction: t }
            );
        };

        const authorVideoId = videoData.user_id;

        await Promise.all([
            db.Like.create(data, { transaction: t }),
            updateVideoLikesCount(data.likeable_id),
            updateUserLikesCount(authorVideoId),
        ]);

        await t.commit();
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

const unlikeVideo = async (data) => {
    //check video id exists
    const videoData = await checkVideoExist(data.likeable_id);
    if (!videoData) {
        throw new ApiError(StatusCodes.NOT_FOUND, `video doesn't exist`);
    }

    const t = await db.sequelize.transaction();
    try {
        const updateVideoLikesCount = (videoId) => {
            return db.Video.decrement(
                {
                    likes_count: 1,
                },
                { where: { id: videoId }, transaction: t }
            );
        };

        const updateUserLikesCount = (userId) => {
            return db.User.decrement(
                {
                    likes_count: 1,
                },
                { where: { id: userId }, transaction: t }
            );
        };

        const authorVideoId = videoData.user_id;

        await Promise.all([
            destroy(db.Like, { where: data, transaction: t }),
            updateVideoLikesCount(data.likeable_id),
            updateUserLikesCount(authorVideoId),
        ]);

        await t.commit();
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

const addVideoToFavorite = async ({ user_id, video_id }) => {
    //check video id exists
    const videoData = await checkVideoExist(video_id);
    if (!videoData) {
        throw new ApiError(StatusCodes.NOT_FOUND, `video doesn't exist`);
    }

    const t = await db.sequelize.transaction();
    try {
        const updateVideoFavoritesCount = (videoId) => {
            return db.Video.increment(
                {
                    favorites_count: 1,
                },
                { where: { id: videoId }, transaction: t }
            );
        };

        await Promise.all([
            db.Favorite.create({ user_id, video_id }, { transaction: t }),
            updateVideoFavoritesCount(video_id),
        ]);

        await t.commit();
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

const removeVideoFromFavorite = async ({ user_id, video_id }) => {
    //check video id exists
    const videoData = await checkVideoExist(video_id);
    if (!videoData) {
        throw new ApiError(StatusCodes.NOT_FOUND, `video doesn't exist`);
    }

    const t = await db.sequelize.transaction();
    try {
        const updateVideoFavoritesCount = (videoId) => {
            return db.Video.decrement(
                {
                    favorites_count: 1,
                },
                { where: { id: videoId }, transaction: t }
            );
        };

        await Promise.all([
            destroy(db.Favorite, {
                where: { user_id, video_id },
                transaction: t,
            }),
            updateVideoFavoritesCount(video_id),
        ]);

        await t.commit();
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

const updateVideo = async (videoId, currentUserId, data, role = ROLE.user) => {
    //check video is of current user
    const video = await checkVideoExist(videoId);
    if (!video) {
        throw new ApiError(
            StatusCodes.NOT_FOUND,
            "This resource doesn't exist"
        );
    }
    if (role === ROLE.user && video.user_id !== currentUserId) {
        throw new ApiError(
            StatusCodes.FORBIDDEN,
            "You don't have permission to access this resource"
        );
    }
    await db.Video.update(data, { where: { id: videoId } });
};

const shareVideoInChat = async (
    senderId,
    optionalMessage,
    sharedData,
    postId,
    conversationIds,
    userIds
) => {
    //check video id exists
    const videoData = await checkVideoExist(postId);
    if (!videoData) {
        throw new ApiError(StatusCodes.NOT_FOUND, `video doesn't exist`);
    }
    const t = await db.sequelize.transaction();
    try {
        //TODO: share to me
        let totalConversationIds = [...conversationIds];
        if (userIds && userIds.length > 0) {
            const newConversations = await db.Conversation.bulkCreate(
                userIds.map(() => ({
                    creator_id: senderId,
                    type: 'direct',
                })),
                { transaction: t }
            );

            await db.Conversation_member.bulkCreate(
                newConversations.reduce((arr, conversation, index) => {
                    const jsonData = conversation.toJSON();
                    arr.push(
                        {
                            conversation_id: jsonData.id,
                            user_id: senderId,
                        },
                        {
                            conversation_id: jsonData.id,
                            user_id: userIds[index],
                        }
                    );
                    return arr;
                }, []),
                { transaction: t }
            );

            totalConversationIds.push(
                ...newConversations.map((conversation) => conversation.id)
            );
        }

        let createMessages = [];
        if (optionalMessage) {
            createMessages = totalConversationIds.map((conversationId) => ({
                sender_id: senderId,
                conversation_id: conversationId,
                content: optionalMessage,
                type: 'text',
            }));
        }

        const saveMessage = () => {
            return db.Message.bulkCreate(
                [
                    ...totalConversationIds.map((conversationId) => ({
                        sender_id: senderId,
                        conversation_id: conversationId,
                        shared_data: sharedData,
                        type: 'shared_post',
                    })),
                    ...createMessages,
                ],
                { transaction: t }
            );
        };

        //upsert to share table
        const upsertShareData = () =>
            totalConversationIds.map(
                (conversationId) => async () =>
                    await db.Share.upsert(
                        {
                            user_id: senderId,
                            video_id: postId,
                            method: 'message',
                            recipient_id: conversationId,
                        },
                        { transaction: t }
                    )
            );

        const [messageResult, ...upsertShareResult] = await Promise.all([
            saveMessage(),
            ...upsertShareData().map((asyncFn) => asyncFn()),
        ]);

        const shareCount = upsertShareResult.reduce((count, currResult) => {
            const [shareInstance, created] = currResult;
            if (created) {
                return count + 1;
            }
            return count;
        }, 0);

        //update video shareCount
        await db.Video.increment(
            {
                shares_count: shareCount || 0,
            },
            { where: { id: postId }, transaction: t }
        );

        const objId = messageResult.reduce((acc, msg) => {
            if (
                !acc[msg.conversation_id] ||
                acc[msg.conversation_id] < msg.id
            ) {
                acc[msg.conversation_id] = msg.id;
            }
            return acc;
        }, {});

        for (const conversationId of Object.keys(objId)) {
            await db.Conversation.update(
                { last_msg_id: objId[conversationId] },
                { where: { id: Number(conversationId) }, transaction: t }
            );
        }

        await t.commit();
        return totalConversationIds;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

const shareVideoByRepost = async (senderId, postId, caption) => {
    //check video id exists
    const videoData = await checkVideoExist(postId);
    if (!videoData) {
        throw new ApiError(StatusCodes.NOT_FOUND, `video doesn't exist`);
    }
    const t = await db.sequelize.transaction();
    try {
        await Promise.all([
            db.Share.create(
                {
                    user_id: senderId,
                    video_id: postId,
                    method: 'repost',
                    caption,
                },
                { transaction: t }
            ),
            //update video shareCount
            db.Video.increment(
                {
                    shares_count: 1,
                },
                { where: { id: postId }, transaction: t }
            ),
        ]);

        await t.commit();
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

const removeReposted = async (senderId, postId) => {
    const t = await db.sequelize.transaction();
    try {
        await Promise.all([
            destroy(db.Share, {
                where: {
                    user_id: senderId,
                    video_id: postId,
                    method: 'repost',
                },
                transaction: t,
            }),
            //update video shareCount
            db.Video.decrement(
                {
                    shares_count: 1,
                },
                { where: { id: postId }, transaction: t }
            ),
        ]);
        await t.commit();
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

const addView = async (currentUserId, videoId, duration, viewNumber) => {
    //check video id exists
    const videoData = await checkVideoExist(videoId);
    if (!videoData) {
        throw new ApiError(StatusCodes.NOT_FOUND, `video doesn't exist`);
    }
    const t = await db.sequelize.transaction();
    try {
        await db.View.create(
            {
                user_id: currentUserId,
                video_id: videoId,
                duration,
                view_number: viewNumber,
            },
            { transaction: t }
        );

        //update view count
        await db.Video.increment(
            {
                views_count: 1,
            },
            { where: { id: videoId }, transaction: t }
        );
        await t.commit();
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

const getFollowingsWithNewestVideos = async (currentUserId, page, perPage) => {
    const { rows: listFollowingWithVideos, count } =
        await db.Follow.findAndCountAll({
            where: {
                follower_id: currentUserId,
            },
            attributes: ['id', 'following_id'],
            include: [
                {
                    model: db.User,
                    as: 'followee',
                    required: true,
                    attributes: [
                        'id',
                        'nickname',
                        'username',
                        'tick',
                        [
                            db.sequelize.literal(
                                `json_extract(avatar, '$.sm')`
                            ),
                            'avatar_url',
                        ],
                    ],
                    include: [
                        {
                            model: db.Video,
                            as: 'videos',
                            attributes: ['id', 'thumb', 'file_url'],
                            where: {
                                status: 'approved',
                            },
                            order: [
                                ['createdAt', 'DESC'],
                                ['id', 'DESC'],
                            ],
                            limit: 1,
                        },
                    ],
                },
            ],
            offset: perPage * (page - 1),
            limit: perPage,
        });
    return {
        listFollowingWithVideos: listFollowingWithVideos
            .map((data) => {
                const jsonData = data.toJSON();

                return {
                    ...jsonData,
                    followee: {
                        ...jsonData.followee,
                        videos: undefined,
                    },
                    newest_video: jsonData.followee?.videos[0] || null,
                };
            })
            .filter((item) => !!item.newest_video),
        count,
    };
};

const getFriendsWithNewestVideos = async (currentUserId, page, perPage) => {
    const { rows: listFollowingWithVideos, count } =
        await db.Follow.findAndCountAll({
            where: {
                [Op.and]: [
                    { follower_id: currentUserId },
                    db.sequelize.literal(
                        `exists (select 1 from Follows as f where f.follower_id = Follow.following_id and f.following_id = ${currentUserId || -1})`
                    ),
                ],
            },
            attributes: ['id', 'following_id'],
            include: [
                {
                    model: db.User,
                    as: 'followee',
                    required: true,
                    attributes: [
                        'id',
                        'nickname',
                        'username',
                        'tick',
                        [
                            db.sequelize.literal(
                                `json_extract(avatar, '$.sm')`
                            ),
                            'avatar_url',
                        ],
                    ],
                    include: [
                        {
                            model: db.Video,
                            as: 'videos',
                            attributes: ['id', 'thumb', 'file_url'],
                            where: {
                                status: 'approved',
                            },
                            order: [
                                ['createdAt', 'DESC'],
                                ['id', 'DESC'],
                            ],
                            limit: 1,
                        },
                    ],
                },
            ],
            offset: perPage * (page - 1),
            limit: perPage,
        });
    return {
        listFollowingWithVideos: listFollowingWithVideos
            .map((data) => {
                const jsonData = data.toJSON();

                return {
                    ...jsonData,
                    followee: {
                        ...jsonData.followee,
                        videos: undefined,
                    },
                    newest_video: jsonData.followee?.videos[0] || null,
                };
            })
            .filter((item) => !!item.newest_video),
        count,
    };
};

const getVideoCategories = async () => {
    const { rows: categories, count } =
        await db.Video_categories.findAndCountAll({
            attributes: {
                exclude: ['createdAt', 'updatedAt'],
            },
        });
    return { categories, count };
};

const report = async (
    currentUserId,
    objectType,
    objectId,
    reasonId,
    ownerId
) => {
    await db.Report.create({
        user_id: currentUserId,
        reportable_type: objectType,
        reportable_id: objectId,
        reason_id: reasonId,
        owner_id: ownerId,
    });
};

const unreport = async (currentUserId, objectId, objectType) => {
    await db.Report.destroy({
        where: {
            user_id: currentUserId,
            reportable_type: objectType,
            reportable_id: objectId,
            is_resolved: false,
        },
    });
};

const deleteVideo = async (videoId, ownerId) => {
    const t = await db.sequelize.transaction();
    try {
        await destroy(db.Video, {
            where: {
                id: videoId,
                user_id: ownerId,
            },
            transaction: t,
        });
        await db.User.decrement(
            { videos_count: 1 },
            {
                where: {
                    id: ownerId,
                },
                transaction: t,
            }
        );
        await t.commit();
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

const getMyListVideos = async (
    currentUserId,
    page,
    perPage,
    sortBy,
    sortType,
    searchStr,
    filter
) => {
    const sort = { order: [['createdAt', 'DESC']] };
    if (sortBy && sortType) {
        if (sortBy === 'viewable') {
            sort.order = [
                [
                    db.sequelize.literal(`
                        CASE viewable WHEN 'public' THEN 1 
                        WHEN 'friends' THEN 2 
                        WHEN 'private' THEN 3
                        END
                    `),
                    sortType,
                ],
            ];
        } else {
            sort.order = [[sortBy, sortType]];
        }
    }
    const { rows: listVideos, count } = await db.Video.findAndCountAll({
        where: {
            user_id: currentUserId,
            ...filter,
            ...(searchStr
                ? {
                      [Op.or]: [
                          { id: { [Op.eq]: searchStr } },
                          { description: { [Op.substring]: searchStr } },
                          { viewable: { [Op.substring]: searchStr } },
                      ],
                  }
                : {}),
        },
        include: [
            {
                model: db.User,
                as: 'user',
                attributes: ['id', 'username', 'avatar'],
            },
            {
                model: db.Video_categories,
                as: 'category',
                attributes: ['id', 'name', 'description'],
            },
        ],
        attributes: [
            'id',
            'uuid',
            'thumb',
            'file_url',
            'description',
            'music',
            'viewable',
            'allows',
            'createdAt',
            'published_at',
            'likes_count',
            'comments_count',
            'shares_count',
            'views_count',
            'favorites_count',
            'category_id',
            'status',
        ],
        limit: perPage,
        offset: perPage * (page - 1),
        ...sort,
    });

    return { listVideos, count };
};

export {
    createVideo,
    getListPosts,
    getListVideos,
    checkVideoWithUsername,
    getVideoWithCheckPrivacy,
    getVideo,
    likeVideo,
    unlikeVideo,
    addVideoToFavorite,
    removeVideoFromFavorite,
    updateVideo,
    shareVideoInChat,
    shareVideoByRepost,
    addView,
    removeReposted,
    searchVideo,
    getFollowingsWithNewestVideos,
    getFriendsWithNewestVideos,
    getVideoCategories,
    report,
    unreport,
    deleteVideo,
    getMyListVideos,
};
