import { User } from "../models/user.model.js";
// User model ko directly import kr rhe h jisse database operations kr ske

import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = jwt.sign(
            { _id: user._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "7d" }
        );
        const refreshToken = jwt.sign(
            { _id: user._id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "30d" }
        );
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
};

export const registerUser = asyncHandler(async (req, res) => {
    // req body -> data
    // firstName, lastName, email, password
    // check if user already exists
    // create user
    // return response
    
    const { firstName, lastName, email, password, phone, company } = req.body;
    
    // body se sare required fields ko extract kr liya
    if (!firstName || !lastName || !email || !password) {
        throw new ApiError(400, "All fields (firstName, lastName, email, password) are required");
    }
    
    // validation check: agr koi bhi required field missing h to error throw kr do
    if (password.length < 6) {
        throw new ApiError(400, "Password must be at least 6 characters long");
    }
    
    // password ki length check kr rhe h taaki weak password na set ho jaye
    const existingUser = await User.findOne({ email });
    
    // check kr rhe h database me ki aisa koi user pehle se exist krta h ki nhi jiska email ye same h
    if (existingUser) {
        throw new ApiError(409, "User with this email already exists");
    }
    
    // agr user pehle se exist krta h to error throw kr do taaki duplicate registration na ho
    const user = new User({
        firstName,
        lastName,
        email,
        password,
        phone: phone || null,
        company: company || null
    });
    
    // naya user object create kiya sare fields ke saath
    await user.save();
    
    // user ko database me save kr diya aur password automatically hash ho jayega pre-save hook ke through
    const createdUser = await User.findById(user._id).select("-password");
    
    // ab user ko dobara database se fetch kr rhe h taaki password field na aaye response me
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }
    
    // check kr rhe h ki user successfully create hua h database me
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(createdUser._id);

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    };

    return res
        .status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                201,
                {
                    user: createdUser,
                    accessToken,
                    refreshToken
                },
                "User registered successfully"
            )
        );
    
    // response me status 201 (created) ke saath user + tokens bhej diya
});

export const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // email
    // find the user
    // password check
    // generate access and refresh tokens
    // send cookies
    
    const { email, password } = req.body;
    
    // body se email aur password ko extract kr liya
    console.log(email);
    
    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }
    
    // validation: agr email ya password missing h to error throw kr do
    const user = await User.findOne({ email }).select("+password");
    
    // database me user ko find kr rhe h email ke basis pe jisse check kr ske ki ye user exist krta h ya nhi
    // .select("+password") - password field exclude hota h by default schema mein (select: false), isliye explicitly select krna padta h
    if (!user) {
        throw new ApiError(401, "User does not exist");
    }
    
    // agr user nhi mila to error throw kr do kyuki login karne ke liye user exist krna zaroori h
    const isPasswordValid = await user.matchPassword(password);
    
    // user model me define kiya hua method h jo incoming password ko database me stored encrypted password se compare krke check krta h ki password sahi h ya nhi aur true ya false return krta h
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }
    
    // agr password sahi nhi h to error throw kr do
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    
    // access token aur refresh token dono generate kr diya user id ke basis pe
    const loggedInUser = await User.findById(user._id).select("-password");
    
    // user ko dobara fetch kr rhe h taaki password field exclude ho response me
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    };
    
    // cookie options set kiye: httpOnly true h taaki client-side scripts se cookies ko access na kiya ja sake aur secure true h production me taaki ye cookies sirf https connection me hi send ho
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User logged in successfully"
            )
        );
    
    // response me access token aur refresh token dono ko cookie me set kr diya taaki frontend se cookie ke through access ho ske aur response body me bhi bhej diya taaki client side JavaScript se bhi access ho ske
});

export const logoutUser = asyncHandler(async (req, res) => {
    // req user se user id
    // clear cookies
    // return response
    
    await User.findByIdAndUpdate(
        req.user._id,
        { $set: { password: req.user.password } },
        { new: true }
    );
    
    // user ko update kr rhe h (yaha pe sirf update operation hai logging purposes ke liye, agar refresh token store krna hota to hum usko yaha unset krte)
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    };
    
    // same cookie options use kr rhe h
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
    
    // cookies ko clear kr diya taaki user ka session end ho jaye aur next request me ye tokens available na ho
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
    // incoming refresh token get
    // token verify
    // user check
    // new access token generate
    // return new token
    
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    // refresh token ko cookies se ya request body se extract kr liya - dono jagah check kr rhe h taaki har jagah se token mil jaye
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }
    
    // agr refresh token hi nhi mila to error throw kr do
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        
        // jwt.verify se token ko verify kr rhe h aur agar token valid hai to decodedToken me uska payload aa jata h (user id) aur agar token invalid ya expired h to ye function error throw kr dega
        const user = await User.findById(decodedToken?._id);
        
        // decoded token me se user id nikl ke database me user ko find kr rhe h
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }
        
        // agr token valid h lekin user database me nhi mila to error throw kr do
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
        
        // naya access token aur refresh token generate kr diya
        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        };
        
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken },
                    "Access token refreshed"
                )
            );
        
        // naya access token aur refresh token dono ko cookie me set kr diya aur response me bhi bhej diya
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

export const getCurrentUser = asyncHandler(async (req, res) => {
    // req.user se user data get
    // return user
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                req.user,
                "Current user fetched successfully"
            )
        );
    
    // req.user auth middleware se aa rha h jisme user ko database se fetch krke store kiya gaya h to simply req.user ko response me bhej diya taaki frontend me logged in user ki complete details mil jaye aur uske basis pe UI customize ho ske
});

export const updateUserProfile = asyncHandler(async (req, res) => {
    // req.user se user id
    // update user profile
    // return updated user
    
    const { firstName, lastName, phone, company, profileImage } = req.body;
    
    // body se jo fields update krni h vo extract kr liya
    if (!firstName && !lastName && !phone && !company && !profileImage) {
        throw new ApiError(400, "At least one field is required to update");
    }
    
    // check kr rhe h ki atleast ek field to provide kiya gaya ho update karne ke liye
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                firstName: firstName || undefined,
                lastName: lastName || undefined,
                phone: phone || undefined,
                company: company || undefined,
                profileImage: profileImage || undefined,
                updatedAt: Date.now()
            }
        },
        { new: true }
    ).select("-password");
    
    // user ke kaunse fields update krne h vo $set me diya aur new: true lga diya taaki updated document return ho aur password field exclude kr diya
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "User profile updated successfully"
            )
        );
    
    // response me updated user data bhej diya
    
});

