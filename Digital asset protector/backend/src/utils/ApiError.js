export class ApiError extends Error {
    constructor(statusCode, message, errors = [], stack = "") {
        super(message);
        // message ko Error class me pass kr rhe h taaki error.message available ho
        
        this.statusCode = statusCode;
        // HTTP status code set kr rhe h like 400, 401, 500 etc taaki frontend ko pta chal jaye ki error kaunsa h
        
        this.errors = errors;
        // array of errors jo additional details provide kar sakte h validation ke liye
        
        this.data = null;
        // ye data field h jo agar kuch data send krni ho error response ke saath to kr skte h
        
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
            // stack trace capture kr rhe h debugging ke liye taaki pta chal jaye error kaha se aa rha h
        }
    }
}

// Example usage:
// throw new ApiError(404, "User not found", [], "");
// throw new ApiError(400, "Email is required", ["email field is missing"], "");

