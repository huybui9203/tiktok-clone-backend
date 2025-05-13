import db from '~/models';
import { Op, QueryTypes } from 'sequelize';

const analytics = async () => {
    const queries = {
        lastMonthPercent(model, currYear, currMonth) {
            return `SELECT (COUNT(*) * 100 /  COUNT(CASE WHEN createdAt < '${currYear}-${currMonth}-01' THEN 1 END)) - 100 AS last_month_percent FROM ${model}`;
        },
    };
    const [
        userCount,
        userCompareWithLastMonth,
        videoCount,
        videoComparedWithLastMonth,
        reportCount,
        reportComparedWithLastMonth,
        groupChatCount,
        groupChatComparedWithLastMonth,
    ] = await Promise.all([
        db.User.count(),
        db.sequelize.query(
            queries.lastMonthPercent(
                'Users',
                new Date().getFullYear(),
                new Date().getMonth() + 1
            ),
            {
                type: QueryTypes.SELECT,
            }
        ),

        db.Video.count(),
        db.sequelize.query(
            queries.lastMonthPercent(
                'Videos',
                new Date().getFullYear(),
                new Date().getMonth() + 1
            ),
            {
                type: QueryTypes.SELECT,
            }
        ),

        db.Report.count(),
        db.sequelize.query(
            queries.lastMonthPercent(
                'Reports',
                new Date().getFullYear(),
                new Date().getMonth() + 1
            ),
            {
                type: QueryTypes.SELECT,
            }
        ),

        db.Conversation.count(),
        db.sequelize.query(
            queries.lastMonthPercent(
                'Conversations',
                new Date().getFullYear(),
                new Date().getMonth() + 1
            ),
            {
                type: QueryTypes.SELECT,
            }
        ),
    ]);

    return {
        stats: {
            user: {
                total: userCount,
                last_month_percent: Number(
                    userCompareWithLastMonth?.[0]?.last_month_percent ?? 0
                ),
            },
            video: {
                total: videoCount,
                last_month_percent: Number(
                    videoComparedWithLastMonth?.[0]?.last_month_percent ?? 0
                ),
            },
            report: {
                total: reportCount,
                last_month_percent: Number(
                    reportComparedWithLastMonth?.[0]?.last_month_percent ?? 0
                ),
            },
            group_chat: {
                total: groupChatCount,
                last_month_percent: Number(
                    groupChatComparedWithLastMonth?.[0]?.last_month_percent ?? 0
                ),
            },
        },
    };
};

const userMonthlyStats = async (year) => {
    const users = await db.User.findAll({
        attributes: [
            [db.sequelize.fn('MONTH', db.sequelize.col('createdAt')), 'month'],
            [
                db.sequelize.fn(
                    'DATE_FORMAT',
                    db.sequelize.col('createdAt'),
                    '%Y-%m'
                ),
                'year_month',
            ],
            [
                db.sequelize.fn(
                    'COALESCE',
                    db.sequelize.fn('COUNT', db.sequelize.col('id')),
                    0
                ),
                'users_per_month',
            ],
        ],

        where: {
            createdAt: {
                [Op.gte]: new Date(`${year}-01-01`),
                [Op.lt]: new Date(`${year + 1}-01-01`),
            },
        },
        group: ['year_month', 'month'],
        order: [['year_month', 'ASC']],
    });

    return users;
};

const videoMonthlyStats = async (year) => {
    const users = await db.Video.findAll({
        attributes: [
            [
                db.sequelize.fn('MONTH', db.sequelize.col('published_at')),
                'month',
            ],
            [
                db.sequelize.fn(
                    'DATE_FORMAT',
                    db.sequelize.col('published_at'),
                    '%Y-%m'
                ),
                'year_month',
            ],
            [
                db.sequelize.fn(
                    'COALESCE',
                    db.sequelize.fn('COUNT', db.sequelize.col('id')),
                    0
                ),
                'videos_per_month',
            ],
        ],

        where: {
            createdAt: {
                [Op.gte]: new Date(`${year}-01-01`),
                [Op.lt]: new Date(`${year + 1}-01-01`),
            },
        },
        group: ['year_month', 'month'],
        order: [['year_month', 'ASC']],
    });

    return users;
};

export { analytics, userMonthlyStats, videoMonthlyStats };
