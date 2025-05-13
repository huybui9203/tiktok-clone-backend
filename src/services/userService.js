import bcrypt from 'bcrypt';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { Op, QueryTypes, where } from 'sequelize';
import redisClient from '~/config/connectionRedis';
import db from '~/models';
import ApiError from '~/utils/ApiError';
import { SALT_ROUNDS } from '~/utils/constants';
import { destroy } from '~/utils/customSequelizeMethods';
import generateUniqueUsername from '~/utils/generateUniqueUsername';
import { getUserIfNotActive } from './authService';

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

const checkUserExist = async (userId) => {
    return await db.User.findByPk(userId, { raw: true });
};

const getCurrentUser = async (userId) => {
    const user = await db.User.findOne({
        where: { id: userId },
        attributes: {
            exclude: ['password'],
        },
    });
    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'user not found');
    }

    const result = await getUserIfNotActive(user);
    if (result) {
        return result;
    }

    return { user, isAvailable: true };
};

const getUserById = async (userId, currentUserId) => {
    const subQueries = {
        isFollowed: `EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = User.id AND Follows.follower_id = ${currentUserId || -1})`,
    };
    const userData = await db.User.findOne({
        where: { id: userId },
        attributes: {
            exclude: [
                'password',
                'social_id',
                'email',
                'email_verified_at',
                'createdAt',
                'updatedAt',
            ],
            include: [
                [db.sequelize.literal(subQueries.isFollowed), 'is_followed'],
            ],
        },
    });
    if (!userData) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'user not found');
    }
    return userData;
};

const getProfileByUsername = async (username, currentUserId, allowRoles) => {
    try {
        const subQueries = {
            isFollowed: `EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = User.id AND Follows.follower_id = ${currentUserId || -1})`,
        };

        const user = await db.User.findOne({
            where: {
                username,
                ...(allowRoles ? { role: allowRoles } : {}),
            },
            attributes: {
                exclude: [
                    'password',
                    'email',
                    'social_id',
                    'email',
                    'email_verified_at',
                    'createdAt',
                    'updatedAt',
                    'facebook_url',
                    'youtube_url',
                    'twitter_url',
                    'instagram_url',
                ],
                include: [
                    [
                        db.sequelize.literal(subQueries.isFollowed),
                        'is_followed',
                    ],
                ],
            },
        });

        if (!user) {
            throw new ApiError(StatusCodes.NOT_FOUND, ReasonPhrases.NOT_FOUND);
        }

        const isFollowed = user.toJSON().is_followed === 1 ? true : false;
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

const getListFriends = async (
    userId,
    searchStr,
    type,
    perPage,
    currentPage
) => {
    try {
        const queries = {
            getList: `select u.id, u.username, u.nickname, JSON_EXTRACT(u.avatar, '$.sm') as avatar_url 
                    from Follows as f1 join Follows as f2 
                    on f1.follower_id = f2.following_id and f1.following_id = f2.follower_id
                    join Users as u on f1.following_id = u.id
                    where f1.follower_id = ${userId} ${searchStr ? `and u.nickname like '%${searchStr}%'` : ''} 
                    limit ${perPage} offset ${(currentPage - 1) * perPage}`,
            count: `select count(*) as friends_count from Follows as f1 join Follows as f2 
                    on f1.follower_id = f2.following_id and f1.following_id = f2.follower_id
                    where f1.follower_id = ${userId}`,
            getListWithShare: `select u.id, u.username, u.nickname, JSON_EXTRACT(u.avatar, '$.sm') as avatar_url ,
                    (select member.conversation_id from Conversation_members as member 
                    join Conversations as c on member.conversation_id = c.id
                    where member.user_id in(${userId}, u.id) and c.type = 'direct' group by member.conversation_id
                    having count(member.conversation_id) = 2) as conversation_id
                    from Follows as f1 join Follows as f2 on f1.follower_id = f2.following_id and f1.following_id = f2.follower_id
                    join Users as u on f1.following_id = u.id 
                    where f1.follower_id = ${userId} ${searchStr ? `and u.nickname like '%${searchStr}%'` : ''} 
                    limit ${perPage} offset ${(currentPage - 1) * perPage}`,
        };
        const [listFriends, friendCount] = await Promise.all([
            db.sequelize.query(
                type === 'share' ? queries.getListWithShare : queries.getList,
                {
                    type: QueryTypes.SELECT,
                }
            ),
            db.sequelize.query(queries.count, {
                type: QueryTypes.SELECT,
            }),
        ]);
        return [listFriends, friendCount];
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
};

const searchUsers = async (
    keyword,
    perPage,
    currentPage,
    type = 'more',
    allowRoles
) => {
    try {
        let pagination;
        switch (type) {
            case 'less':
                pagination = { limit: 5 };
                break;
            case 'more':
                pagination = {
                    limit: perPage,
                    offset: (currentPage - 1) * perPage,
                };
                break;
            default:
                pagination = {};
        }

        let condition = {};
        if (allowRoles) {
            condition = { role: allowRoles };
        }
        const { count, rows: listUsers } = await db.User.findAndCountAll({
            where: {
                [Op.or]: [
                    { username: { [Op.substring]: keyword } },
                    { nickname: { [Op.substring]: keyword } },
                ],
                ...condition,
            },
            attributes: [
                'id',
                'username',
                'nickname',
                [
                    db.sequelize.literal(`JSON_EXTRACT(avatar, '$.sm')`),
                    'avatar_url',
                ],
                'tick',
                'followers_count',
                'bio',
            ],
            ...pagination,
        });
        return { count, listUsers };
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
};

const getListSuggested = async (limit, currentUserId, allowRoles) => {
    const subQueries = {
        isFollowed: `EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = User.id AND Follows.follower_id = ${currentUserId || -1})`,
    };
    const listSuggested = await db.User.findAll({
        where: {
            [Op.and]: [
                allowRoles ? { role: allowRoles } : {},
                { id: { [Op.ne]: currentUserId } },
                db.sequelize.literal(
                    `NOT EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = User.id AND Follows.follower_id = ${currentUserId})`
                ),
                { followers_count: { [Op.gt]: 0 } },
            ],
        },
        attributes: [
            'id',
            'username',
            'nickname',
            'bio',
            'tick',
            'followings_count',
            'followers_count',
            'likes_count',
            [db.sequelize.literal(subQueries.isFollowed), 'is_followed'],
            [
                db.sequelize.literal(`JSON_EXTRACT(avatar, '$.sm')`),
                'avatar_url',
            ],
        ],
        limit,
        order: [
            ['followers_count', 'DESC'],
            ['likes_count', 'DESC'],
            ['videos_count', 'DESC'],
        ],
    });
    return listSuggested;
};

const getListFollowings = async (currentUserId, page, perPage) => {
    const queries = {
        getList: `select u.id, u.username, u.nickname, json_extract(u.avatar, '$.sm') as avatar_url, u.bio, u.tick,
                u.followings_count, u.followers_count, u.likes_count
                from Follows as f join Users as u on f.following_id = u.id 
                where f.follower_id = ${currentUserId} 
                limit ${perPage} offset ${(page - 1) * perPage}`,
        count: `select count(*) as followings_count from Follows as f where f.follower_id = ${currentUserId} `,
    };
    const [listFollowings, followingsCount] = await Promise.all([
        db.sequelize.query(queries.getList, {
            type: QueryTypes.SELECT,
        }),
        db.sequelize.query(queries.count, {
            type: QueryTypes.SELECT,
        }),
    ]);
    return {
        listFollowings: listFollowings.map((item) => ({
            ...item,
            tick: !!item.tick,
        })),
        followingsCount,
    };
};

const checkIsFriends = async (userId1, userId2) => {
    const resultCount = await db.Follow.count({
        where: {
            [Op.or]: [
                { follower_id: userId1, following_id: userId2 },
                { follower_id: userId2, following_id: userId1 },
            ],
        },
    });
    return resultCount === 2;
};

const getListVideos = async (username, page, perPage, currentUserId) => {
    const subQueries = {
        isFollowed: `EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = user.id AND Follows.    follower_id = ${currentUserId || -1})`,
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
    //check username is of currentUserId
    let otherUserAttributes = [];
    let otherVideoAttributes = [];
    let viewables = [];
    const user = await getUserByUsername(username);
    if (user.id !== currentUserId) {
        //check is friends
        const isFriends = await checkIsFriends(user.id, currentUserId);
        if (isFriends) {
            viewables = ['public', 'friends'];
        } else {
            viewables = ['public'];
        }

        otherVideoAttributes = [
            [db.sequelize.literal(subQueries.isReposted), 'is_reposted'],
            [db.sequelize.literal(subQueries.lastTimeView), 'last_view'],
        ];

        otherUserAttributes = [
            [db.sequelize.literal(subQueries.isFollowed), 'is_followed'],
        ];
    }

    const conditions =
        currentUserId === user.id
            ? {}
            : {
                  where: {
                      viewable: { [Op.in]: viewables },
                      status: 'approved',
                  },
              };

    const { rows: listVideos, count: videoCount } =
        await db.Video.findAndCountAll({
            ...conditions,
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
                        include: [...otherUserAttributes],
                    },
                    where: {
                        username: username,
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
                    ...otherVideoAttributes,
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
            order: [['createdAt', 'DESC']],
        });
    return { listVideos, videoCount };
};

const followUser = async (followerId, followingId) => {
    // check user id exists
    const user = await checkUserExist(followingId);
    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, `user doesn't exist`);
    }

    const t = await db.sequelize.transaction();
    try {
        const updateFollowingsCount = (followerId) => {
            return db.User.increment(
                {
                    followings_count: 1,
                },
                { where: { id: followerId }, transaction: t }
            );
        };

        const updateFollowersCount = (followingId) => {
            return db.User.increment(
                {
                    followers_count: 1,
                },
                { where: { id: followingId }, transaction: t }
            );
        };

        await Promise.all([
            db.Follow.create(
                { follower_id: followerId, following_id: followingId },
                { transaction: t }
            ),
            updateFollowersCount(followingId),
            updateFollowingsCount(followerId),
        ]);

        await t.commit();
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

const unfollowUser = async (followerId, followingId) => {
    // check user id exists
    const user = await checkUserExist(followingId);
    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, `user doesn't exist`);
    }

    const t = await db.sequelize.transaction();
    try {
        const updateFollowingsCount = (followerId) => {
            return db.User.decrement(
                {
                    followings_count: 1,
                },
                { where: { id: followerId }, transaction: t }
            );
        };

        const updateFollowersCount = (followingId) => {
            return db.User.decrement(
                {
                    followers_count: 1,
                },
                { where: { id: followingId }, transaction: t }
            );
        };

        await Promise.all([
            destroy(db.Follow, {
                where: { follower_id: followerId, following_id: followingId },
                transaction: t,
            }),
            updateFollowersCount(followingId),
            updateFollowingsCount(followerId),
        ]);

        await t.commit();
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

const getListVideosLiked = async (currentUserId, page, perPage) => {
    const subQueries = {
        isFollowed: `EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = user.id AND Follows.    follower_id = ${currentUserId || -1})`,
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

    const { rows: listVideos, count: videoCount } =
        await db.Video.findAndCountAll({
            where: {
                [Op.or]: [
                    { user_id: currentUserId },
                    { viewable: 'public', status: 'approved' },
                    {
                        [Op.and]: [
                            {
                                viewable: {
                                    [Op.eq]: 'friends',
                                },
                                status: 'approved',
                            },
                            db.sequelize.literal(
                                `exists (select * from Follows as f1 join Follows as f2 
                                on f1.follower_id = f2.following_id and f1.following_id = f2.follower_id
                                where f1.follower_id = ${currentUserId} and f1.following_id = Video.user_id)`
                            ),
                        ],
                    },
                    ,
                ],
            },
            include: [
                {
                    model: db.Like,
                    as: 'like_info',
                    attributes: [],
                    where: {
                        user_id: currentUserId,
                    },
                },
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
            order: [[{ model: db.Like, as: 'like_info' }, 'createdAt', 'DESC']],
        });
    return {
        listVideos: listVideos.map((video) => {
            const jsonData = video.toJSON();
            return {
                ...jsonData,
                is_liked: true,
            };
        }),
        videoCount,
    };

    // const queries = {
    //     getList: `select v.*, u.id as 'user.id', u.username as 'user.username', u.nickname as
    //             'user.nickname', u.avatar as 'user.avatar', u.bio as 'user.bio', u.tick as 'user.tick',
    //             u.createdAt as 'user.createdAt', u.updatedAt as
    //             'user.updatedAt', u.followings_count as 'user.followings_count', u.followers_count as
    //             'user.followers_count', u.likes_count as 'user.likes_count', u.videos_count as
    //             'user.videos_count', (EXISTS (SELECT 1 FROM Favorites WHERE Favorites.video_id = v.id
    //             AND Favorites.user_id = ${currentUserId || -1})) as is_add_to_favorite ,
    //             (EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = u.id
    //             AND Follows.follower_id = ${currentUserId || -1})) as 'user.is_followed'
    //             from Likes as l join Videos as v
    //             on l.likeable_id = v.id join Users as u on v.user_id = u.id
    //             where l.user_id = ${currentUserId || -1} and likeable_type = 'video'
    //             limit ${perPage} offset ${(page - 1) * perPage}`,
    //     count: `select count(*) as videos_count from Likes as l
    //             where l.user_id = ${currentUserId || -1} and likeable_type = 'video'`,
    // };
    // const [listVideos, videoCount] = await Promise.all([
    //     db.sequelize.query(queries.getList, {
    //         type: QueryTypes.SELECT,
    //         nest: true,
    //     }),
    //     db.sequelize.query(queries.count, {
    //         type: QueryTypes.SELECT,
    //     }),
    // ]);
    // return {
    //     listVideos: listVideos.map((item) => ({
    //         ...item,
    //         is_liked: true,
    //         is_add_to_favorite: !!item.is_add_to_favorite,
    //         user: {
    //             ...item.user,
    //             tick: !!item.user?.tick,
    //             is_followed: !!item.user?.is_followed,
    //         },
    //     })),
    //     videoCount: videoCount?.[0]?.videos_count,
    // };
};

const getListFavoriteVideos = async (currentUserId, page, perPage) => {
    const subQueries = {
        isFollowed: `EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = user.id AND Follows.    follower_id = ${currentUserId || -1})`,
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

    const { rows: listVideos, count: videoCount } =
        await db.Video.findAndCountAll({
            where: {
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
                    ,
                ],
            },
            include: [
                {
                    model: db.Favorite,
                    as: 'favorite_info',
                    attributes: [],
                    where: {
                        user_id: currentUserId,
                    },
                },
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
            order: [
                [
                    { model: db.Favorite, as: 'favorite_info' },
                    'createdAt',
                    'DESC',
                ],
            ],
        });
    return {
        listVideos: listVideos.map((video) => {
            const jsonData = video.toJSON();
            return {
                ...jsonData,
                is_add_to_favorite: true,
            };
        }),
        videoCount,
    };
    // const queries = {
    //     getList: `select v.*, u.id as 'user.id', u.username as 'user.username', u.nickname as
    //             'user.nickname', u.avatar as 'user.avatar', u.bio as 'user.bio', u.tick as 'user.tick',
    //             u.createdAt as 'user.createdAt', u.updatedAt as
    //             'user.updatedAt', u.followings_count as 'user.followings_count', u.followers_count as
    //             'user.followers_count', u.likes_count as 'user.likes_count', u.videos_count as
    //             'user.videos_count', (EXISTS (SELECT 1 FROM Likes WHERE Likes.likeable_type = 'video'
    //             AND Likes.likeable_id = v.id AND Likes.user_id = ${currentUserId || -1})) as is_liked ,
    //             (EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = u.id
    //             AND Follows.follower_id = ${currentUserId || -1})) as 'user.is_followed'
    //             from Favorites as f join Videos as v
    //             on f.video_id = v.id join Users as u on v.user_id = u.id
    //             where f.user_id = ${currentUserId || -1}
    //             limit ${perPage} offset ${(page - 1) * perPage}`,
    //     count: `select count(*) as videos_count from Favorites as f
    //             where f.user_id = ${currentUserId || -1}`,
    // };
    // const [listVideos, videoCount] = await Promise.all([
    //     db.sequelize.query(queries.getList, {
    //         type: QueryTypes.SELECT,
    //         nest: true,
    //     }),
    //     db.sequelize.query(queries.count, {
    //         type: QueryTypes.SELECT,
    //     }),
    // ]);
    // return {
    //     listVideos: listVideos.map((item) => ({
    //         ...item,
    //         is_liked: !!item.is_liked,
    //         is_add_to_favorite: true,
    //         user: {
    //             ...item.user,
    //             tick: !!item.user?.tick,
    //             is_followed: !!item.user?.is_followed,
    //         },
    //     })),
    //     videoCount: videoCount?.[0]?.videos_count,
    // };
};

const getListVideosReposted = async (userId, currentUserId, page, perPage) => {
    const subQueries = {
        isFollowed: `EXISTS (SELECT 1 FROM Follows WHERE Follows.following_id = user.id AND Follows.    follower_id = ${currentUserId || -1})`,
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

    let shareConditions = {};
    if (userId === currentUserId) {
        shareConditions = db.sequelize.literal(
            `exists (select 1 from Shares as s where s.user_id = ${currentUserId} and s.video_id = Video.id and method='repost')`
        );
    } else {
        shareConditions = db.sequelize.literal(
            `exists (select 1 from Shares as s where s.user_id = ${userId} and s.video_id = Video.id and method='repost' and
            exists (select 1 from Follows where Follows.follower_id = ${currentUserId || -1} and Follows.following_id = ${userId}))`
        );
    }

    const { rows: listVideos, count: videoCount } =
        await db.Video.findAndCountAll({
            where: {
                status: 'approved',
                shareConditions,
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
                    required: true,
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
            // order: [[{ model: db.Share, as: 'sharers' }, 'createdAt', 'DESC']],
        });
    return {
        listVideos: listVideos.map((video) => {
            const jsonData = video.toJSON();
            return {
                ...jsonData,
                is_reposted: true,
            };
        }),
        videoCount,
    };
};

const deleteUser = async (userId, role) => {
    await db.User.destroy({
        where: {
            id: userId,
            ...(role ? { role } : {}),
        },
    });
};



export {
    createUser,
    getUserbyEmail,
    updateUserById,
    getUserById,
    getProfileByUsername,
    getUserByUsername,
    updateProfile,
    getListFriends,
    searchUsers,
    getListSuggested,
    getListFollowings,
    getListVideos,
    followUser,
    unfollowUser,
    getCurrentUser,
    getListVideosLiked,
    getListFavoriteVideos,
    getListVideosReposted,
    deleteUser,
};
