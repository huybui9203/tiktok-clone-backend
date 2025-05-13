import db from '~/models';
import { Op } from 'sequelize';
import { destroy } from '~/utils/customSequelizeMethods';

const getListConversations = async (
    page,
    perPage,
    sortBy,
    sortType,
    searchStr
) => {
    const sort = { order: [['createdAt', 'DESC']] };
    if (sortBy && sortType) {
        if (sortBy === 'creatorName') {
            sort.order = [
                [{ model: db.User, as: 'creator' }, 'username', sortType],
            ];
        } else {
            sort.order = [[sortBy, sortType]];
        }
    }
    const { rows: listConversations, count } =
        await db.Conversation.findAndCountAll({
            where: {
                ...(searchStr
                    ? {
                          [Op.or]: [
                              { id: { [Op.eq]: searchStr } },
                              { name: { [Op.substring]: searchStr } },
                              { createdAt: { [Op.substring]: searchStr } },
                              db.sequelize.literal(
                                  `creator.username like '%${searchStr}%'`
                              ),
                          ],
                      }
                    : {}),
            },
            include: [
                {
                    model: db.User,
                    as: 'creator',
                    attributes: ['id', 'username', 'avatar', 'nickname'],
                },
            ],
            attributes: {
                include: [
                    [
                        db.sequelize.literal(`
                        (select count(*) from Conversation_members as cm
                        where cm.conversation_id = Conversation.id)   
                    `),
                        'members_count',
                    ],
                ],
            },
            limit: perPage,
            offset: perPage * (page - 1),
            ...sort,
        });

    return { listConversations, count };
};

const destroyConversation = async (id) => {
    await destroy(db.Conversation, {
        where: { id },
    });
};

export { getListConversations, destroyConversation };
