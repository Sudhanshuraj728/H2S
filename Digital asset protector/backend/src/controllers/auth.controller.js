import { User } from "../models/user.model.js";
// User model ko directly import kr rhe h jisse database operations kr ske

import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
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

const getOAuthStateSecret = () => process.env.OAUTH_STATE_SECRET || process.env.ACCESS_TOKEN_SECRET;

const getGoogleClient = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        throw new ApiError(500, "Google OAuth is not configured");
    }

    return new OAuth2Client(clientId, clientSecret, redirectUri);
};

const normalizeRedirectPath = (value) => {
    if (!value || typeof value !== "string") return "/dashboard";
    if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
    return value;
};

const parseOAuthState = (state) => {
    if (!state) return null;
    try {
        return jwt.verify(state, getOAuthStateSecret());
    } catch {
        return null;
    }
};

const getFrontendOAuthRedirectBase = () => {
    if (process.env.FRONTEND_OAUTH_REDIRECT_URL) {
        return process.env.FRONTEND_OAUTH_REDIRECT_URL;
    }

    const clientBase = process.env.CLIENT_URL || process.env.CORS_ORIGIN || "http://localhost:5173";
    return `${clientBase.replace(/\/$/, "")}/oauth/google`;
};

const buildOAuthRedirectUrl = ({ accessToken, refreshToken, redirectPath }) => {
    const url = new URL(getFrontendOAuthRedirectBase());
    const params = new URLSearchParams();

    if (accessToken) params.set("accessToken", accessToken);
    if (refreshToken) params.set("refreshToken", refreshToken);
    if (redirectPath) params.set("redirect", redirectPath);

    url.hash = params.toString();
    return url.toString();
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
        authProvider: "local",
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

    if (user.authProvider === "google") {
        throw new ApiError(401, "This account uses Google sign-in");
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

export const googleAuthStart = asyncHandler(async (req, res) => {
    const redirectPath = normalizeRedirectPath(req.query.redirect);
    const state = jwt.sign({ redirect: redirectPath }, getOAuthStateSecret(), { expiresIn: "10m" });

    const client = getGoogleClient();
    const url = client.generateAuthUrl({
        access_type: "offline",
        scope: ["email", "profile"],
        prompt: "select_account",
        state
    });

    return res.redirect(url);
});

export const googleAuthCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
        throw new ApiError(400, "Missing authorization code");
    }

    const client = getGoogleClient();
    const { tokens } = await client.getToken(code);

    if (!tokens?.id_token) {
        throw new ApiError(400, "Missing Google ID token");
    }

    const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (!payload?.email) {
        throw new ApiError(400, "Google account email not available");
    }

    if (payload.email_verified === false) {
        throw new ApiError(401, "Google email is not verified");
    }

    const email = payload.email.toLowerCase();
    let user = await User.findOne({ email }).select("-password");

    if (!user) {
        const fullName = payload.name || "";
        const nameParts = fullName.trim().split(" ").filter(Boolean);
        const firstName = payload.given_name || nameParts[0] || "Google";
        const lastName = payload.family_name || nameParts.slice(1).join(" ") || "User";
        const randomPassword = crypto.randomBytes(32).toString("hex");

        const createdUser = await User.create({
            firstName,
            lastName,
            email,
            password: randomPassword,
            authProvider: "google",
            googleId: payload.sub,
            profileImage: payload.picture || null
        });

        user = await User.findById(createdUser._id).select("-password");
    } else {
        const updates = {};

        if (!user.googleId && payload.sub) updates.googleId = payload.sub;
        if (!user.profileImage && payload.picture) updates.profileImage = payload.picture;

        if (Object.keys(updates).length) {
            user = await User.findByIdAndUpdate(
                user._id,
                { $set: { ...updates, updatedAt: Date.now() } },
                { new: true }
            ).select("-password");
        }
    }

    if (!user) {
        throw new ApiError(500, "Failed to resolve user after Google sign-in");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    };

    const decodedState = parseOAuthState(state);
    const redirectPath = normalizeRedirectPath(decodedState?.redirect);
    const redirectUrl = buildOAuthRedirectUrl({ accessToken, refreshToken, redirectPath });

    return res
        .status(302)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .redirect(redirectUrl);
});

export const getCurrentUser = asyncHandler(async (req, res) => {
    // req.user se user data get
    // return user
    const user = await User.findById(req.user?._id).select("-password");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user },
                "Current user fetched successfully"
            )
        );
    
    // req.user auth middleware se aa rha h jisme user id aa rha h, isliye db se user fetch krke response bhej rhe h
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

