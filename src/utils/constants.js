const WHITELIST_DOMAINS = ['http://127.0.0.1:5500']; //domain allowed cors in prod mode
const SALT_ROUNDS = 10;
const JWT_EXPIRES = {
    accessToken: 60,
    refreshToken: 7 * 24 * 60 * 60,
};

const jwtTypes = {
    ACCESS: 'access',
    REFRESH: 'refresh',
}

const OTP_EXPIRES = 60
const TOKEN_AUTH_EXPIRES = 60

export { WHITELIST_DOMAINS, SALT_ROUNDS, JWT_EXPIRES, OTP_EXPIRES, TOKEN_AUTH_EXPIRES, jwtTypes };
