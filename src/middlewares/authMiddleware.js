import { StatusCodes } from 'http-status-codes';
import ApiError from '~/utils/ApiError';
import * as tokenService from '~/services/tokenService';
import { jwtTypes } from '~/utils/constants';

const authMiddleware = (req, res, next) => {
    try {
        const token = req.get('Authorization')?.split(' ')[1];

        if (!token) {
            throw new ApiError(StatusCodes.UNAUTHORIZED, 'No token provided');
        }
        const payload = tokenService.verifyToken(token, jwtTypes.ACCESS);
        req.currentUser = payload;
        next();
    } catch (error) {
        next(error);
    }
};

const authMiddlewareForVideoRoute = (req, res, next) => {
    try {
        const token = req.get('Authorization')?.split(' ')[1];

        if (!token) {
            req.currentUser = null;
            next();
            return;
        }
        const payload = tokenService.verifyToken(token, jwtTypes.ACCESS);
        req.currentUser = payload;
        next();
    } catch (error) {
        next(error);
    }
};

export { authMiddlewareForVideoRoute };
export default authMiddleware;
