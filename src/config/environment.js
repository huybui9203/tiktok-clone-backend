import 'dotenv/config';

const env = {
    PORT: process.env.PORT || 5001,
    BUILD_MODE: process.env.NODE_ENV,
    CLOUDINARY_NAME: process.env.CLOUDINARY_NAME,
    CLOUDINARY_KEY: process.env.CLOUDINARY_KEY,
    CLOUDINARY_SECRET: process.env.CLOUDINARY_SECRET,
    DB_DATABASE: process.env.DB_DATABASE,
    DB_HOST: process.env.DB_DATABASE,
    DB_PASS: process.env.DB_DATABASE,
    DB_USER: process.env.DB_DATABASE,
    DB_PORT: process.env.DB_DATABASE,
    DB_DIALECT: process.env.DB_DIALECT,
    DB_CONNECT_URI: process.env.DB_CONNECT_URI,

    JWT_SECRET_AT: process.env.JWT_SECRET_AT,
    JWT_SECRET_RT: process.env.JWT_SECRET_RT,

    SMPT_MAIL: process.env.SMPT_MAIL,
    SMPT_APP_PASS: process.env.SMPT_APP_PASS,
    APP_URL: process.env.APP_URL,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PASS: process.env.REDIS_PASS,

    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,

    FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
    FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
    FACEBOOK_CALLBACK_URL: process.env.FACEBOOK_CALLBACK_URL,

    URL_CLIENT: process.env.URL_CLIENT,
};

export default env;
