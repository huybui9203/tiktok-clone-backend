import Redis from 'ioredis';
import env from './environment';

// Redis.Promise.onPossiblyUnhandledRejection(function (error) {
//     // you can log the error here.
//     // error.command.name is the command name, here is 'set'
//     // error.command.args is the command arguments, here is ['foo']

// });

const redisClient = new Redis({
    port: env.REDIS_PORT,
    host: env.REDIS_HOST,
    family: 4,
    password: env.REDIS_PASS,
    db: 0,
    retryStrategy: function (times) {
        var delay = Math.min(times * 2, 2000);
        return delay;
    },
    // showFriendlyErrorStack: env.BUILD_MODE !== 'production' ? true : false, //show error stack and only in prod env to not decrease the performance
});

const ping = () => {
    redisClient
        .ping()
        .then((value) => console.log(value))
        .catch((err) => console.log(err));
    // .finally(() => redisClient.quit());
};

ping();

export default redisClient;
