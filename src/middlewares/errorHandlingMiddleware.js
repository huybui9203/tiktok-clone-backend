import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import env from '~/config/environment';

const errorHandlingMiddleware = (err, req, res, next) => {
    const errorResponse = {
        code: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
        message: err.message || ReasonPhrases.INTERNAL_SERVER_ERROR,
        stack: err.stack,
    }
    
    if (env.BUILD_MODE !== 'development') {
        delete errorResponse.stack;
    }
    res.status(errorResponse.code).json(errorResponse);
};

export default errorHandlingMiddleware;


