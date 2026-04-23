// Database name
export const DB_NAME = "optiprimes";
// ye database ka naam h jisko mongodb me create karega

// HTTP status codes - HTTP standards ke according
export const HTTP_STATUS = {
    OK: 200,
    // request successful tha
    CREATED: 201,
    // naya resource create hua
    BAD_REQUEST: 400,
    // client ne galat data bheji h
    UNAUTHORIZED: 401,
    // authentication failed - user ne login nhi kiya ya token invalid h
    FORBIDDEN: 403,
    // authentication successful par authorization failed - user ke paas permission nhi h kuch karne ke liye
    NOT_FOUND: 404,
    // resource nhi mila database me
    CONFLICT: 409,
    // conflict - example: user already exists with ye email
    INTERNAL_SERVER_ERROR: 500
    // server pe kuch error hua joh client ke control me nhi h
};

// Custom messages
export const MESSAGES = {
    SUCCESS: "Success",
    // generic success message
    ERROR: "Error",
    // generic error message
    VALIDATION_ERROR: "Validation Error",
    // data validation me error hua
    NOT_FOUND: "Not Found"
    // resource nhi mila
};

// ye constants sare files me use ho skte h taaki hardcoded values na rkhni padhe
// example: throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Email is required");

