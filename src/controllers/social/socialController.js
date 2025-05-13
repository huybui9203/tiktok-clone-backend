import { StatusCodes } from 'http-status-codes';
import * as authService from '~/services/authService';
import * as tokenService from '~/services/tokenService';
import { JWT_EXPIRES } from '~/utils/constants';

const loginWithSocial = async (req, res, next) => {
    try {
        const { socialId, tokenAuth, socialType } = req.body;
        const user = await authService.loginWithSocial(
            socialId,
            tokenAuth,
            socialType
        );
        const tokens = await tokenService.generateAuthTokens(
            user.id,
            user.role
        );

        res.cookie('refresh_token', tokens.refresh_token, {
            httpOnly: true,
            // secure: true,
            sameSite: 'Strict',
            maxAge: JWT_EXPIRES.refreshToken * 1000,
        });

        res.status(StatusCodes.CREATED).json({
            data: user,
            meta: { token: tokens.access_token, method: socialType },
            message: 'success',
        });
    } catch (error) {
        next(error);
    }
};

export { loginWithSocial };
