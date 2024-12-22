
require('dotenv').config()

const getTimezone = () => {
    const offset = new Date().getTimezoneOffset(); //minutes
    const hours = Math.abs(Math.floor(offset / 60)).toString().padStart(2, '0');
    const minutes = Math.abs(offset % 60).toString().padStart(2, '0');
    const sign = offset > 0 ? '-' : '+';
    return `${sign}${hours}:${minutes}`;
}


const configDB = {
    development: {
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_DATABASE,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: process.env.DB_DIALECT,
        timezone: getTimezone(), //for writing to db
        dialectOptions: { //for reading from db
            // useUTC: false,
            dateStrings: true,
            typeCast: true,
        },
        // query: {
        //     'raw': true
        // },
        pool: {
            max: 5, // Maximum number of connections in the pool
            min: 0, // Minimum number of connections in the pool
            acquire: 30000, // Maximum time, in milliseconds, that a connection can be acquired
            idle: 10000, // Maximum time, in milliseconds, that a connection can be idle before being released
          },
        // logging: false,
        
        
    },
    test: {
        username: 'root',
        password: null,
        database: 'database_test',
        host: '127.0.0.1',
        dialect: 'mysql',
        timezone: getTimezone(),
        dialectOptions: { 
            dateStrings: true,
            typeCast: true,
        },
    },
    production: {
        username: 'root',
        password: null,
        database: 'database_production',
        host: '127.0.0.1',
        dialect: 'mysql',
        timezone: getTimezone(),
        dialectOptions: { 
            dateStrings: true,
            typeCast: true,
        },
    },
};

module.exports = configDB