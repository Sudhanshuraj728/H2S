import express from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    refreshAccessToken,
    updateUserProfile
} from "../controllers/auth.controller.js";
import { verifyJWT, verifyAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// ========== PUBLIC ROUTES ==========
// ye routes login kiye bina accessible h kyuki authentication middleware nhi lga h

router.route("/register").post(registerUser);
// POST /api/users/register - naya user create krne ke liye
// body: {firstName, lastName, email, password, phone, company}
// response: {user: {...}, accessToken, refreshToken}

router.route("/login").post(loginUser);
// POST /api/users/login - user ko login krwane ke liye
// body: {email, password}
// response: {user: {...}, accessToken, refreshToken}
// cookies: set hote h accessToken aur refreshToken

router.route("/refresh-token").post(refreshAccessToken);
// POST /api/users/refresh-token - expired access token ko refresh krne ke liye
// body: {refreshToken} (optional, cookies se bhi le sakta h)
// response: {accessToken, refreshToken}

// ========== PROTECTED ROUTES ==========
// ye routes sirf login kiye hue users ke liye accessible h kyuki verifyJWT middleware lga h

router.route("/me").get(verifyJWT, getCurrentUser);
// GET /api/users/me - currently logged in user ki details get krne ke liye
// headers: {Authorization: "Bearer <accessToken>"} OR cookies: {accessToken}
// response: {user: {...}}
// ye route verifyJWT se check krta h ki user properly authenticated h tab hi current user return krta h

router.route("/logout").post(verifyJWT, logoutUser);
// POST /api/users/logout - user ko logout krne ke liye
// headers: {Authorization: "Bearer <accessToken>"} OR cookies: {accessToken}
// response: {} (empty)
// cookies: clear hote h accessToken aur refreshToken

router.route("/profile").put(verifyJWT, updateUserProfile);
// PUT /api/users/profile - logged in user apni profile update kr sakta h
// headers: {Authorization: "Bearer <accessToken>"} OR cookies: {accessToken}
// body: {firstName?, lastName?, phone?, company?, profileImage?}
// response: {user: {...}} (updated user)
// ye route verifyJWT se check krta h that user login h tab hi profile update allow krta h

export default router;

