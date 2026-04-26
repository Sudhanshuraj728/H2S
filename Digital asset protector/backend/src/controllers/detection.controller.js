// ========== IMPORTS ==========
import { Detection } from "../models/detection.model.js";
// Detection model ko directly import kr rhe h jisse database operations kr ske

import { Asset } from "../models/asset.model.js";
// Asset model ko import kr rhe h kyuki detection ko asset se link krna h

import { User } from "../models/user.model.js";
// User model ko import kr rhe h kyuki ownership verification ke liye

import { asyncHandler } from "../utils/asyncHandler.js";
// asyncHandler wrapper use kr rhe h jo promise ke errors ko automatically catch krta h

import { ApiError } from "../utils/ApiError.js";
// Custom error class use kr rhe h uniform error responses ke liye

import { ApiResponse } from "../utils/ApiResponse.js";
// Custom response class use kr rhe h uniform success responses ke liye

// ========== CONTROLLER FUNCTIONS ==========

// ===== 1. CREATE DETECTION (When Violation Found) =====
export const createDetection = asyncHandler(async (req, res) => {
    // req body -> data
    // assetId, platform, detectedUrl, confidence, matchScore
    // userId automatically req.user se aayega (from JWT middleware)
    // detection record create krna database me

    const { assetId, platform, detectedUrl, confidence, matchScore, thumbnailUrl } = req.body;
    // req.body se detection ki information extract kr rhe h

    if (!assetId || !platform || !detectedUrl) {
        throw new ApiError(400, "assetId, platform, and detectedUrl are required");
    }
    // validation: required fields check kr rhe h

    const asset = await Asset.findById(assetId);
    // first asset exist krta h ki nahi check kro

    if (!asset) {
        throw new ApiError(404, "Asset not found");
    }

    if (asset.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to report detection for this asset");
    }
    // ownership verify kr rhe h - sirf asset ke owner hi detection report kr sakte h

    const detection = await Detection.create({
        assetId,
        userId: req.user._id,
        // userId automatically set hota h - jo user login h uski ID set hoti h
        platform,
        detectedUrl,
        confidence: confidence || 95,
        // default confidence 95% agar provide nahi kiya to
        matchScore: matchScore || 85,
        // default matchScore 85
        thumbnailUrl,
        status: "pending",
        // initially pending status - abhi koi action nahi liya
    });

    // Detection.create se detection create hota h aur database me save bhi hota h

    // Asset ke detection count aur lastDetectedAt update krte h
    asset.detectionCount = (asset.detectionCount || 0) + 1;
    asset.lastDetectedAt = new Date();
    if (asset.detections === undefined) {
        asset.detections = [];
    }
    asset.detections.push(detection._id);
    // newly created detection ka ID asset ke detections array mein add krte h
    await asset.save();

    const createdDetection = await Detection.findById(detection._id)
        .populate("assetId", "_id title fileType platform")
        .populate("userId", "_id firstName lastName email");
    // .populate("assetId", "_id title fileType platform") - asset ki basic info
    // .populate("userId", "_id firstName lastName email") - user ki info

    return res.status(201).json(
        new ApiResponse(201, createdDetection, "Detection recorded successfully")
    );
});

// ===== 2. GET ALL DETECTIONS (For Current User) =====
export const getDetections = asyncHandler(async (req, res) => {
    // req.user se userId lete h
    // user ke saare detections get krte h
    // pagination aur filtering support

    const userId = req.user._id;

    const { page = 1, limit = 10, status, platform, assetId } = req.query;
    // query parameters: page, limit, status (filter), platform (filter), assetId (filter)
    // example: /api/detections?page=1&limit=20&status=pending&platform=youtube

    const query = { userId };
    // initially query sirf user ke basis par h

    if (status) {
        query.status = status;
        // agar status filter diya h to add kro - pending, reported, resolved, false_positive
    }

    if (platform) {
        query.platform = platform;
        // agar specific platform ka detection chahiye
    }

    if (assetId) {
        query.assetId = assetId;
        // agar specific asset ke detections chahiye
    }

    const skip = (page - 1) * limit;

    const detections = await Detection.find(query)
        .populate("assetId", "_id title fileType")
        .populate("userId", "_id firstName lastName email")
        .skip(skip)
        .limit(limit)
        .sort({ detectionDate: -1 });
    // -1 matlab newest detections first

    const totalDetections = await Detection.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                detections,
                pagination: {
                    total: totalDetections,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(totalDetections / limit),
                },
            },
            "Detections retrieved successfully"
        )
    );
});

// ===== 3. GET SINGLE DETECTION =====
export const getDetectionById = asyncHandler(async (req, res) => {
    // req.params se detection ID lete h
    // ownership verify krte h
    // detection details return krte h

    const { detectionId } = req.params;

    const detection = await Detection.findById(detectionId)
        .populate("assetId", "_id title fileType platform owner")
        .populate("userId", "_id firstName lastName email");

    if (!detection) {
        throw new ApiError(404, "Detection not found");
    }

    if (detection.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to view this detection");
    }
    // ownership verify kr rhe h

    return res.status(200).json(
        new ApiResponse(200, detection, "Detection retrieved successfully")
    );
});

// ===== 4. UPDATE DETECTION STATUS =====
export const updateDetectionStatus = asyncHandler(async (req, res) => {
    // req.params se detection ID lete h
    // req.body se new status lete h
    // status: pending, reported, resolved, false_positive

    const { detectionId } = req.params;
    const { status, reportDetails, notes } = req.body;
    // status = new status
    // reportDetails = DMCA, copyright, etc info
    // notes = admin notes

    if (!status) {
        throw new ApiError(400, "Status is required");
    }

    const detection = await Detection.findById(detectionId);

    if (!detection) {
        throw new ApiError(404, "Detection not found");
    }

    if (detection.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this detection");
    }

    // Status update krte h
    detection.status = status;
    // .status = "reported" / "resolved" / "false_positive"

    if (status === "reported" && reportDetails) {
        detection.actionTaken.dmcaSent = true;
        detection.actionTaken.dmcaSentDate = new Date();
        detection.reportDetails = reportDetails;
        detection.reportedDate = new Date();
        // agar reported status diya to reportDetails add krte h
    }

    if (status === "resolved") {
        detection.actionTaken.contentRemoved = true;
        detection.actionTaken.contentRemovedDate = new Date();
        detection.resolvedDate = new Date();
        // agar resolved to content remove ho gya
    }

    if (notes) {
        detection.notes = notes;
    }

    await detection.save();

    const updatedDetection = await Detection.findById(detectionId)
        .populate("assetId", "_id title fileType")
        .populate("userId", "_id firstName lastName email");

    return res.status(200).json(
        new ApiResponse(200, updatedDetection, "Detection status updated successfully")
    );
});

// ===== 5. GET DETECTIONS BY ASSET =====
export const getDetectionsByAsset = asyncHandler(async (req, res) => {
    // specific asset ke saare detections get krte h
    // dashboard me asset ke violations dikhane ke liye

    const { assetId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const asset = await Asset.findById(assetId);

    if (!asset) {
        throw new ApiError(404, "Asset not found");
    }

    if (asset.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to view detections for this asset");
    }

    const skip = (page - 1) * limit;

    const detections = await Detection.find({ assetId })
        .populate("userId", "_id firstName lastName email")
        .skip(skip)
        .limit(limit)
        .sort({ detectionDate: -1 });

    const totalDetections = await Detection.countDocuments({ assetId });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                asset: {
                    _id: asset._id,
                    title: asset.title,
                    detectionCount: asset.detectionCount,
                    lastDetectedAt: asset.lastDetectedAt,
                },
                detections,
                pagination: {
                    total: totalDetections,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(totalDetections / limit),
                },
            },
            "Asset detections retrieved successfully"
        )
    );
});

// ===== 6. GET DETECTIONS BY PLATFORM =====
export const getDetectionsByPlatform = asyncHandler(async (req, res) => {
    // specific platform par kitne detections hain - analytics ke liye

    const { platform } = req.params;
    const userId = req.user._id;

    const detections = await Detection.find({ userId, platform })
        .populate("assetId", "_id title")
        .sort({ detectionDate: -1 });

    const platformStats = {
        platform,
        totalDetections: detections.length,
        resolved: detections.filter(d => d.status === "resolved").length,
        pending: detections.filter(d => d.status === "pending").length,
        reported: detections.filter(d => d.status === "reported").length,
    };

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                stats: platformStats,
                detections,
            },
            `Detections from ${platform} retrieved successfully`
        )
    );
});

// ===== 7. MARK DETECTION AS FALSE POSITIVE =====
export const markAsFalsePositive = asyncHandler(async (req, res) => {
    // jab detection galat ho - false positive h
    // user false positive mark kr sakta h

    const { detectionId } = req.params;
    const { reason } = req.body;
    // reason = kyu false positive h

    const detection = await Detection.findById(detectionId);

    if (!detection) {
        throw new ApiError(404, "Detection not found");
    }

    if (detection.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this detection");
    }

    detection.status = "false_positive";
    detection.notes = reason || "Marked as false positive by user";
    await detection.save();

    // Asset ka detectionCount decrease krte h (kyuki ye real violation nahi h)
    const asset = await Asset.findById(detection.assetId);
    if (asset && asset.detectionCount > 0) {
        asset.detectionCount -= 1;
        await asset.save();
    }

    const updatedDetection = await Detection.findById(detectionId)
        .populate("assetId", "_id title")
        .populate("userId", "_id firstName lastName email");

    return res.status(200).json(
        new ApiResponse(200, updatedDetection, "Detection marked as false positive")
    );
});

// ===== 8. GET DETECTION STATISTICS =====
export const getDetectionStatistics = asyncHandler(async (req, res) => {
    // user ke detections ka analysis kr rhe h - dashboard stats ke liye

    const userId = req.user._id;

    const totalDetections = await Detection.countDocuments({ userId });
    // total kitne detections detect hue

    const pendingDetections = await Detection.countDocuments({
        userId,
        status: "pending",
    });
    // abhi pending h - koi action nahi liya

    const resolvedDetections = await Detection.countDocuments({
        userId,
        status: "resolved",
    });
    // resolved - content remove ho gya

    const reportedDetections = await Detection.countDocuments({
        userId,
        status: "reported",
    });
    // reported - DMCA bhej diya

    const falsePositives = await Detection.countDocuments({
        userId,
        status: "false_positive",
    });
    // galat detections jinhe user ne false positive mark kiya

    // Platform-wise breakdown
    const detectionsByPlatform = await Detection.aggregate([
        { $match: { userId } },
        { $group: { _id: "$platform", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);
    // har platform par kitne detections h

    // Status-wise breakdown
    const detectionsByStatus = await Detection.aggregate([
        { $match: { userId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const similarityTrend = await Detection.aggregate([
        {
            $match: {
                userId,
                combinedSimilarityPercentage: { $ne: null },
                similarityScoreOutOf20: { $ne: null },
            },
        },
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$detectionDate",
                    },
                },
                avgCombinedSimilarityPercentage: {
                    $avg: "$combinedSimilarityPercentage",
                },
                avgSimilarityScoreOutOf20: {
                    $avg: "$similarityScoreOutOf20",
                },
                detections: { $sum: 1 },
            },
        },
        {
            $project: {
                _id: 0,
                date: "$_id",
                avgCombinedSimilarityPercentage: {
                    $round: ["$avgCombinedSimilarityPercentage", 2],
                },
                avgSimilarityScoreOutOf20: {
                    $round: ["$avgSimilarityScoreOutOf20", 2],
                },
                detections: 1,
            },
        },
        { $sort: { date: 1 } },
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            summary: {
                totalDetections,
                pending: pendingDetections,
                resolved: resolvedDetections,
                reported: reportedDetections,
                falsePositives,
            },
            byPlatform: detectionsByPlatform,
            byStatus: detectionsByStatus,
            similarityTrend,
        })
    );
});

// ===== 9. GET RECENT DETECTIONS (For Dashboard) =====
export const getRecentDetections = asyncHandler(async (req, res) => {
    // dashboard ke liye recent 10 detections fetch kr rhe h

    const userId = req.user._id;
    const { limit = 10 } = req.query;

    const detections = await Detection.find({ userId })
        .populate("assetId", "_id title fileType")
        .populate("userId", "_id firstName lastName")
        .sort({ detectionDate: -1 })
        .limit(parseInt(limit));

    return res.status(200).json(
        new ApiResponse(200, detections, "Recent detections retrieved successfully")
    );
});
