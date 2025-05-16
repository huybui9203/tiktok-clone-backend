import { Op } from 'sequelize';
import db from '~/models';

const getListReports = async (lastTime, lastId, userId, perPage) => {
    const newLastId =
        lastId === undefined
            ? (await db.Report.max('id')) + 100000
            : Number(lastId);

    const { rows: listReports, count } = await db.Report.findAndCountAll({
        where: {
            [Op.and]: [
                {
                    user_id: userId,
                },
                {
                    [Op.or]: [
                        db.sequelize.literal(
                            `Report.updatedAt < '${lastTime}'`
                        ),
                        db.sequelize.literal(
                            `(Report.updatedAt = '${lastTime}' and Report.id < ${newLastId})`
                        ),
                    ],
                },
            ],
        },
        include: [
            {
                model: db.Report_reason,
                as: 'reason',
                attributes: ['id', 'text'],
            },
             {
                model: db.User,
                as: 'owner',
                attributes: ['id', 'username', 'nickname'],
            },
        ],
        order: [
            [
                db.sequelize.literal(
                    `CASE WHEN Report.is_resolved = false THEN 0 ELSE 1 END`
                ),
                'DESC',
            ],
            ['updatedAt', 'DESC'],
            ['id', 'DESC'],
        ],
        limit: perPage,
    });
    return { listReports, count };
};

const getReportReasons = async () => {
    const { rows: listReasons, count } = await db.Report_reason.findAndCountAll(
        {
            attributes: {
                exclude: ['createdAt', 'updatedAt'],
            },
        }
    );
    return { listReasons, count };
};
export { getReportReasons, getListReports };
