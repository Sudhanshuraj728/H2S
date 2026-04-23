export class ApiResponse {
    constructor(statusCode, data, message = "Success") {
        // standardized response format jisse har jagah consistent response milta h frontend ko
        
        this.statusCode = statusCode;
        // HTTP status code like 200, 201, 400, 401 etc
        
        this.data = data;
        // actual data jo frontend ko send krni h response me user info, assets, analytics etc
        
        this.message = message;
        // user-friendly message jo explain kre ki operation successful hua ya error hua
        
        this.success = statusCode < 400;
        // success flag: agr status code 400 se kam h (200-399) to success true hoga else false
    }
}

// Example usage:
// new ApiResponse(200, userData, "User logged in successfully")
// new ApiResponse(201, newUser, "User registered successfully")
// return res.status(200).json(new ApiResponse(200, user, "Current user fetched"));

