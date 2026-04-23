// ========== IMPORTS ==========
import { Router } from "express";
// Router use kr rhe h Express se - endpoints create krne ke liye

import { verifyJWT } from "../middleware/auth.middleware.js";
// verifyJWT middleware se authentication check krte h - sirf login user access kr sake

import {
    createDetection,
    getDetections,
    getDetectionById,
    updateDetectionStatus,
    getDetectionsByAsset,
    getDetectionsByPlatform,
    markAsFalsePositive,
    getDetectionStatistics,
    getRecentDetections,
} from "../controllers/detection.controller.js";
// saare controller functions import kr rhe h

// ========== ROUTER INITIALIZATION ==========
const router = Router();
// Express Router instance create kr rhe h

// ========== PROTECTED ROUTES (User Authentication Required) ==========
// Saare routes protected h - verifyJWT middleware se

// ===== 1. CREATE DETECTION =====
router.post("/", verifyJWT, createDetection);
// POST /api/detections
// Body: { assetId, platform, detectedUrl, confidence, matchScore }
// Response: Detection object with populated asset and user details
// Kab call hota: jab asset kisi platform par detect ho jaye
// Kya hota: Detection record create hota h, asset ka detectionCount increase hota h

// ===== 2. GET ALL DETECTIONS (User ke saare detections) =====
router.get("/", verifyJWT, getDetections);
// GET /api/detections
// Query Params: page=1, limit=10, status=pending, platform=youtube, assetId=xyz
// Response: Array of detections with pagination metadata
// Kab call hota: user apne saare violations dekhne ke liye
// Filter support: status (pending/reported/resolved/false_positive), platform, assetId

// ===== 3. GET DETECTION STATISTICS (Dashboard) =====
router.get("/stats", verifyJWT, getDetectionStatistics);
// GET /api/detections/stats
// Response: { summary, byPlatform, byStatus }
// summary: { totalDetections, pending, resolved, reported, falsePositives }
// byPlatform: Array of {_id: platform, count: number}
// byStatus: Array of {_id: status, count: number}
// Kab call hota: dashboard page load hone par analytics dikhane ke liye

// ===== 4. GET RECENT DETECTIONS =====
router.get("/recent", verifyJWT, getRecentDetections);
// GET /api/detections/recent
// Query Params: limit=10
// Response: Array of recent detections (newest first)
// Kab call hota: dashboard widget me recent violations dikhane ke liye

// ===== 5. GET DETECTIONS BY PLATFORM =====
router.get("/platform/:platform", verifyJWT, getDetectionsByPlatform);
// GET /api/detections/platform/youtube
// Response: { stats: { platform, totalDetections, resolved, pending, reported }, detections: [] }
// Kab call hota: specific platform ke sare detections filter krne ke liye
// Example: YouTube par kitne violations h

// ===== 6. GET DETECTIONS BY ASSET =====
router.get("/asset/:assetId", verifyJWT, getDetectionsByAsset);
// GET /api/detections/asset/123abc
// Query Params: page=1, limit=10
// Response: { asset: {...}, detections: [], pagination: {...} }
// Kab call hota: specific asset ke sare detections dekhne ke liye
// Ownership check: sirf asset ke owner hi dekh sakta h

// ===== 7. GET SINGLE DETECTION =====
router.get("/:detectionId", verifyJWT, getDetectionById);
// GET /api/detections/123abc
// Response: Single detection object with populated fields
// Kab call hota: detection ke details dekhne ke liye
// Ownership check: sirf uska detection hi dekh sakta h

// ===== 8. UPDATE DETECTION STATUS =====
router.put("/:detectionId/status", verifyJWT, updateDetectionStatus);
// PUT /api/detections/123abc/status
// Body: { status: "reported", reportDetails: {...}, notes: "..." }
// Response: Updated detection object
// Kab call hota: status change krne ke liye (pending -> reported -> resolved)
// Status options: "pending", "reported", "resolved", "false_positive"

// ===== 9. MARK AS FALSE POSITIVE =====
router.post("/:detectionId/false-positive", verifyJWT, markAsFalsePositive);
// POST /api/detections/123abc/false-positive
// Body: { reason: "Not actually our content" }
// Response: Updated detection with false_positive status
// Kab call hota: jab user ko pata chale ye detection galat h
// Side effect: Asset ka detectionCount decrease hota h

// ========== EXPORT ==========
export default router;
// detection routes export kr rhe h - app.js me mount krne ke liye
