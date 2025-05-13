import { StatusCodes } from 'http-status-codes';
import { default as roles } from '~/config/roles';
import ApiError from '~/utils/ApiError';

const checkPermission = (action, allowRoles) => {
    //default all allow all roles
    return (req, res, next) => {
        const userRole = req.currentUser?.role;
        const permistions = roles[userRole];
        if (allowRoles && !allowRoles.includes(userRole)) {
            throw new ApiError(StatusCodes.FORBIDDEN, 'Access Denied');
        }
        if (permistions && permistions.includes(action)) {
            next();
        } else {
            throw new ApiError(StatusCodes.FORBIDDEN, 'Access Denied');
        }
    };
};

export default checkPermission;
