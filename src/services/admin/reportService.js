import db from '~/models';
import bcrypt from 'bcrypt';
import { SALT_ROUNDS } from '~/utils/constants';
import generateUniqueUsername from '~/utils/generateUniqueUsername';
import { Op } from 'sequelize';
import ApiError from '~/utils/ApiError';
import { StatusCodes } from 'http-status-codes';

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

const getListReports = async (
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
        if (sortBy === 'action' || sortBy === 'reportable_type') {
            sort.order = [
                [db.sequelize.literal(`CAST(${sortBy} AS CHAR)`), sortType],
            ];
        } else if (sortBy === 'username') {
            sort.order = [
                [{ model: db.User, as: 'user' }, 'username', sortType],
            ];
        } else {
            sort.order = [[sortBy, sortType]];
        }
    }
    const { rows: listReports, count } = await db.Report.findAndCountAll({
        where: {
            ...filter,
            ...(searchStr
                ? {
                      [Op.or]: [
                          { id: { [Op.eq]: searchStr } },
                          { reportable_type: { [Op.substring]: searchStr } },
                          { createdAt: { [Op.substring]: searchStr } },
                          db.sequelize.literal(
                              `user.username like '%${searchStr}%'`
                          ),
                      ],
                  }
                : {}),
            ...(allowRoles ? { role: allowRoles } : {}),
        },
        include: [
            {
                model: db.User,
                as: 'user',
                attributes: ['id', 'username'],
            },
        ],
        attributes: [
            'id',
            'user_id',
            'reportable_type',
            'reportable_id',
            'is_resolved',
            'createdAt',
            'action',
        ],
        limit: perPage,
        offset: perPage * (page - 1),
        ...sort,
    });

    return { listReports, count };
};

const getReportDetail = async (reportId, type) => {
    let includeModel = {};
    if (type === 'video') {
        includeModel = {
            model: db.Video,
            as: 'video',
            attributes: [
                'id',
                'thumb',
                'file_url',
                'description',
                'published_at',
            ],
            include: [
                {
                    model: db.User,
                    as: 'user',
                    attributes: [
                        'id',
                        'username',
                        'nickname',
                        'tick',
                        'avatar',
                    ],
                },
            ],
        };
    } else if (type === 'comment') {
        includeModel = {
            model: db.Comment,
            as: 'comment',
            attributes: [
                'id',
                'comment',
                'createdAt',
                'edited_at',
                'likes_count',
            ],
            include: [
                {
                    model: db.User,
                    as: 'user',
                    attributes: [
                        'id',
                        'username',
                        'nickname',
                        'tick',

                        'avatar',
                    ],
                },
                {
                    model: db.Video,
                    as: 'video',
                    attributes: ['id'],
                    include: {
                        model: db.User,
                        as: 'user',
                        attributes: ['id', 'username'],
                    },
                },
            ],
        };
    } else {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid report type');
    }
    const reportData = await db.Report.findByPk(reportId, {
        attributes: [
            'id',
            'createdAt',
            'reportable_type',
            'reportable_id',
            'is_resolved',
            'action',
        ],
        include: [
            {
                model: db.User,
                as: 'user',
                attributes: ['id', 'username'],
            },
            {
                model: db.User,
                as: 'owner',
                attributes: ['id', 'username'],
            },
            {
                model: db.Report_reason,
                as: 'reason',
                attributes: { exclude: ['createdAt', 'updatedAt'] },
            },
            includeModel,
        ],
    });
    if (!reportData) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Report not found');
    }
    return reportData;
};

const handleReport = async (reportId, action) => {
    await db.Report.update(
        {
            action,
            is_resolved: true,
        },
        {
            where: {
                id: reportId,
            },
        }
    );
};

export { getListReports, getReportDetail, handleReport };
