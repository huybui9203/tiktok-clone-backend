import { StatusCodes } from 'http-status-codes';
import * as conversationService from '~/services/admin/conversationService';

const getListConversations = async (req, res, next) => {
    try {
        const { page, sortBy, sortType, q: searchStr } = req.query;
        const perPage = 5;
        let sortByField = sortBy;
        switch (sortBy) {
            case 'date':
                sortByField = 'createdAt';
                break;
            case 'memberCount':
                sortByField = 'members_count';
                break;
            default:
                break;
        }
        const { listConversations, count } =
            await conversationService.getListConversations(
                page,
                perPage,
                sortByField,
                sortType,
                searchStr
            );
        res.status(StatusCodes.OK).json({
            data: listConversations,
            meta: {
                pagination: {
                    total: count,
                    per_page: perPage,
                    total_pages: Math.ceil(count / perPage),
                    current_page: Number(page),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const destroyConversation = async (req, res, next) => {
    try {
        const { id } = req.params;
        await conversationService.destroyConversation(id);
        res.status(StatusCodes.OK).json({
            message: 'success',
            conversation_id: Number(id),
        });
    } catch (error) {
        next(error);
    }
};

export { getListConversations, destroyConversation };
