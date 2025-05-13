import ApiError from './ApiError';
import { StatusCodes } from 'http-status-codes';

const destroy = async (model, options) => {
    const destroyedRows = await model.destroy(options);
    if (destroyedRows === 0) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'No records are deleted');
    }
    return destroyedRows;
};

export { destroy };
