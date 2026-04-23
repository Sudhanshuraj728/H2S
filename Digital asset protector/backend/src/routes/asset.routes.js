import express from "express";
import {
    uploadAsset,
    getAllAssets,
    getAssetById,
    updateAsset,
    deleteAsset,
    getAssetByFileHash,
    flagAsset,
    getAssetStatistics,
} from "../controllers/asset.controller.js";
// Asset controller ke saare functions ko import kr rhe h

import { verifyJWT } from "../middleware/auth.middleware.js";
// verifyJWT middleware lgrha h - protected routes ke liye taaki sirf authenticated users access kr ske

const router = express.Router();

// ========== PROTECTED ROUTES ==========
// ye routes sirf login kiye hue users ke liye accessible hain kyuki verifyJWT middleware lga h
// har asset operation mein user authenticated hona chahiye

router.route("/").post(verifyJWT, uploadAsset);
// POST /api/assets - naya asset upload krne ke liye
// headers: {Authorization: "Bearer <accessToken>"} OR cookies: {accessToken}
// body: {title, fileUrl, fileHash, fileType, fileSize, description?, platforms?}
// response: {asset: {...}}
// ye route verifyJWT se check krta h ki user login h, phir asset upload krta h


router.route("/").get(verifyJWT, getAllAssets);
// GET /api/assets - currently logged in user ke saare assets get krne ke liye
// headers: {Authorization: "Bearer <accessToken>"} OR cookies: {accessToken}
// query params: {page?, limit?, status?}
// page = paige number (default 1), limit = items per page (default 10)
// status = filter by status (active, flagged, archived, deleted)
// example: GET /api/assets?page=1&limit=20&status=flagged
// response: {assets: [...], pagination: {total, page, limit, pages}}
// ye route user ke saare assets paginated form mein return krta h


router.route("/by-hash/:fileHash").get(verifyJWT, getAssetByFileHash);
// GET /api/assets/by-hash/:fileHash - fileHash se asset find krne ke liye
// headers: {Authorization: "Bearer <accessToken>"} OR cookies: {accessToken}
// params: fileHash (cryptographic fingerprint)
// example: GET /api/assets/by-hash/abc123def456
// response: {asset: {...}}
// ye route detection system use krega - jab same file detect ho tab ye API use hota h
// fingerprint ke basis par exact match find krta h


router.route("/:assetId/flag").post(verifyJWT, flagAsset);
// POST /api/assets/:assetId/flag - asset ko flag krne ke liye (violation detected)
// headers: {Authorization: "Bearer <accessToken>"} OR cookies: {accessToken}
// params: assetId
// body: {violationUrl?, platform?, reason?}
// response: {asset: {...}} (updated asset with flagged status)
// ye route jab copyright violation detect ho tab call hota h
// asset ka status "flagged" set krta h aur detectionCount increment krta h
// lastDetectedAt update hota h current time se


router.route("/stats").get(verifyJWT, getAssetStatistics);
// GET /api/assets/stats - user ke assets ka statistics get krne ke liye
// headers: {Authorization: "Bearer <accessToken>"} OR cookies: {accessToken}
// response: {
//   totalAssets: 291,
//   protectedAssets: 289,
//   flaggedAssets: 2,
//   totalDetections: 5,
//   detectionRate: "1.72%"
// }
// ye route dashboard mein statistics dikhane ke liye use hota h
// aggregate pipeline se calculations hoteh


router.route("/:assetId").get(verifyJWT, getAssetById);
// GET /api/assets/:assetId - single asset ki details get krne ke liye
// headers: {Authorization: "Bearer <accessToken>"} OR cookies: {accessToken}
// params: assetId (asset ka MongoDB ID)
// example: GET /api/assets/65a1b2c3d4e5f6a7b8c9d0e1
// response: {asset: {...}}
// ye route verify krta h ki asset user ka h, phir details return krta h (ownership check)


router.route("/:assetId").put(verifyJWT, updateAsset);
// PUT /api/assets/:assetId - asset ki details update krne ke liye
// headers: {Authorization: "Bearer <accessToken>"} OR cookies: {accessToken}
// params: assetId
// body: {title?, description?, status?, platforms?, tags?}
// response: {asset: {...}} (updated asset)
// ye route verify krta h ki asset user ka h, phir update krta h
// NOTE: fileUrl, fileHash, fileType, fileSize change nahi kr skte - ye fixed hain


router.route("/:assetId").delete(verifyJWT, deleteAsset);
// DELETE /api/assets/:assetId - asset ko permanently delete krne ke liye
// headers: {Authorization: "Bearer <accessToken>"} OR cookies: {accessToken}
// params: assetId
// response: {message: "Asset deleted successfully"}
// ye route verify krta h ki asset user ka h, phir delete krta h


export default router;

// ========== ROUTE HIERARCHY ==========
// /api/assets            → asset CRUD operations (create, read, update, delete)
// /api/assets/:assetId   → specific asset operations
// /api/assets/by-hash/:fileHash → detection system ke liye (exact match)
// /api/assets/:assetId/flag     → violation flagging
// /api/assets/stats      → analytics ke liye

// ========== MIDDLEWARE FLOW ==========
// 1. Request aata h
// 2. verifyJWT middleware chalti h - token extract, verify, user fetch
// 3. req.user._id set hota h middleware se
// 4. Controller function chalti h - req.user use krta h ownership check krne ke liye
// 5. Response return hota h

// ========== NOTES ==========
// - Sirf authenticated users hi assets ka kaam kr sakte h
// - Har user bas apne assets dekh/update/delete kr sakta h (dusro ke nahi)
// - Staff/admin ko verify krne ke liye agar zrurat ho to verifyAdmin middleware add kr sakte h
// - Soft delete chahiye to status = "deleted" set kr sakte h permanent delete ki jagah
