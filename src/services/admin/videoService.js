import db from '~/models';
import bcrypt from 'bcrypt';
import { SALT_ROUNDS } from '~/utils/constants';
import generateUniqueUsername from '~/utils/generateUniqueUsername';
import { Op } from 'sequelize';
import ApiError from '~/utils/ApiError';
import { StatusCodes } from 'http-status-codes';
import { destroy } from '~/utils/customSequelizeMethods';

const createUser = async (data) => {
    const { email, password } = data;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const username = generateUniqueUsername([
        email?.slice(0, email?.indexOf('@')),
    ]);
    await db.User.create({
        ...data,
        nickname: username,
        username,
        password: hashedPassword,
        email_verified_at: new Date(),
    });
};

const updateUser = async (userId, data) => {
    if (data.password) {
        const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
        return await db.User.update(
            { ...data, password: hashedPassword },
            {
                where: {
                    id: userId,
                },
            }
        );
    }
    await db.User.update(data, {
        where: {
            id: userId,
        },
    });
};

const getListVideos = async (
    page,
    perPage,
    sortBy,
    sortType,
    searchStr,
    filter
) => {
    const sort = { order: [['createdAt', 'DESC']] };
    if (sortBy && sortType) {
        if (sortBy === 'category') {
            sort.order = [
                [
                    { model: db.Video_categories, as: 'category' },
                    'name',
                    sortType,
                ],
            ];
        } else if (sortBy === 'viewable') {
            sort.order = [
                [db.sequelize.literal(`CAST(${sortBy} AS CHAR)`), sortType],
            ];
        } else if (sortBy === 'username') {
            sort.order = [
                [{ model: db.User, as: 'user' }, 'username', sortType],
            ];
        } else if (sortBy === 'status') {
            sort.order = [
                [
                    db.sequelize.literal(`CAST(Video.${sortBy} AS CHAR)`),
                    sortType,
                ],
            ];
        } else {
            sort.order = [[sortBy, sortType]];
        }
    }
    const { rows: listVideos, count } = await db.Video.findAndCountAll({
        where: {
            ...filter,
            ...(searchStr
                ? {
                      [Op.or]: [
                          { id: { [Op.eq]: searchStr } },
                          { description: { [Op.substring]: searchStr } },
                          { viewable: { [Op.substring]: searchStr } },
                          { status: { [Op.substring]: searchStr } },
                          db.sequelize.literal(
                              `user.username like '%${searchStr}%'`
                          ),
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

const getVideoDetail = async (videoId) => {
    const data = await db.Video.findByPk(videoId, {
        include: [
            {
                model: db.User,
                as: 'user',
                attributes: ['id', 'username', 'nickname', 'tick', 'avatar'],
            },
            {
                model: db.Video_categories,
                as: 'category',
                attributes: ['id', 'name', 'description'],
            },
        ],
        attributes: [
            'id',
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
    });

    if (!data) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Video not found');
    }
    return data;
};

const getListCategories = async (
    page,
    perPage,
    sortBy,
    sortType,
    searchStr
) => {
    const sort = { order: [['createdAt', 'DESC']] };
    if (sortBy && sortType) {
        sort.order = [[sortBy, sortType]];
    }
    const { rows: listCategories, count } =
        await db.Video_categories.findAndCountAll({
            where: {
                ...(searchStr
                    ? {
                          [Op.or]: [
                              { id: { [Op.eq]: searchStr } },
                              { name: { [Op.substring]: searchStr } },
                          ],
                      }
                    : {}),
            },
            limit: perPage,
            offset: perPage * (page - 1),
            ...sort,
        });

    return { listCategories, count };
};

const createCategory = async (data) => {
    await db.Video_categories.create(data);
};

const updateCategory = async (id, data) => {
    await db.Video_categories.update(data, { where: { id } });
};

const deleteCategory = async (id) => {
    await destroy(db.Video_categories, {
        where: { id },
    });
};

export {
    getListVideos,
    getVideoDetail,
    getListCategories,
    createCategory,
    updateCategory,
    deleteCategory,
};
