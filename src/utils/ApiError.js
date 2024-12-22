class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;

        //write stacktrace to debug
        Error.captureStackTrace(this, this.constructor);
    }
}

export default ApiError;
