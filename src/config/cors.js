import ApiError from '~/utils/ApiError';
import { WHITELIST_DOMAINS } from '../utils/constants';
import env from '~/config/environment';

const corsOptions = {
    origin: function (origin, callback) {
        //localhost, postman on dev mode
        if (env.BUILD_MODE === 'development') {
            return callback(null, true);
        }
        //other modes
        if (WHITELIST_DOMAINS.indexOf(origin) !== -1) {
            return callback(null, true);
        }

        callback(
            new ApiError(
                403,
                `${origin || 'This origin'} not allowed by our CORS Policy.`
            )
        );
    },

    // Some legacy browsers (IE11, various SmartTVs) choke on 204
    optionsSuccessStatus: 200,

    // CORS allowed get cookies from request
    credentials: true,
};

export { corsOptions };
