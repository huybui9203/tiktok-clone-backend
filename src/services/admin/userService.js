import db from '~/models';
import bcrypt from 'bcrypt';
import { SALT_ROUNDS } from '~/utils/constants';
import generateUniqueUsername from '~/utils/generateUniqueUsername';
import { Op } from 'sequelize';

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

const getListUsers = async (
    page,
    perPage,
    sortBy,
    sortType,
    searchStr,
    filter,
    allowRoles
) => {
    const sort = { order: [['createdAt', 'DESC']] };
    if (sortBy && sortType) {
        sort.order = [[sortBy, sortType]];
    }
    const { rows: listUsers, count } = await db.User.findAndCountAll({
        where: {
            ...filter,
            ...(searchStr
                ? {
                      [Op.or]: [
                          { id: { [Op.eq]: searchStr } },
                          { username: { [Op.substring]: searchStr } },
                          { email: { [Op.substring]: searchStr } },
                          { nickname: { [Op.substring]: searchStr } },
                          { status: { [Op.substring]: searchStr } },
                          { role: { [Op.substring]: searchStr } },
                      ],
                  }
                : {}),
            ...(allowRoles && filter.role === undefined
                ? { role: allowRoles }
                : {}),
        },
        attributes: [
            'id',
            'username',
            'nickname',
            'email',
            'role',
            'status',
            'tick',
            'bio',
            'date_of_birth',
            'createdAt',
            'likes_count',
            'followings_count',
            'followers_count',
            'videos_count',
            [
                db.sequelize.literal(`json_extract(avatar, '$.sm')`),
                'avatar_url',
            ],
            [
                db.sequelize.literal(`json_extract(avatar, '$.public_id')`),
                'public_avt_id',
            ],
        ],
        limit: perPage,
        offset: perPage * (page - 1),
        ...sort,
    });

    return { listUsers, count };
};

export { createUser, getListUsers, updateUser };
