// ========== IMPORTS ==========
import { Alert } from "../models/alert.model.js";
// Alert model ko directly import kr rhe h - database operations ke liye

import { Detection } from "../models/detection.model.js";
// Detection model import kr rhe h - alert ko detection se link krne ke liye

import { Asset } from "../models/asset.model.js";
// Asset model import kr rhe h - ownership verification ke liye

import { User } from "../models/user.model.js";
// User model import kr rhe h - staff assignment aur ownership ke liye

import { asyncHandler } from "../utils/asyncHandler.js";
// asyncHandler wrapper use kr rhe h - promise errors automatically catch krta h

import { ApiError } from "../utils/ApiError.js";
// Custom error class use kr rhe h - uniform error responses ke liye

import { ApiResponse } from "../utils/ApiResponse.js";
// Custom response class use kr rhe h - uniform success responses ke liye

// ========== CONTROLLER FUNCTIONS ==========

// ===== 1. CREATE ALERT (When Serious Violation Detected) =====
export const createAlert = asyncHandler(async (req, res) => {
    // Detection ke basis par alert create krte h
    // req.body -> assetId, detectionId (optional), title, description, violationType, severity

    const {
        assetId,
        detectionId,
        title,
        description,
        violationType,
        severity,
        platform: inputPlatform,
        urlFound: inputUrlFound,
    } = req.body;
    // req.body se alert ki information extract kr rhe h

    if (!assetId || !title || !description || !violationType || !severity) {
        throw new ApiError(400, "assetId, title, description, violationType, and severity are required");
    }
    // validation: required fields check kr rhe h

    const asset = await Asset.findById(assetId);
    // first asset exist krta h ki nahi check kro

    if (!asset) {
        throw new ApiError(404, "Asset not found");
    }

    if (asset.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to create alerts for this asset");
    }
    // ownership verify kr rhe h - sirf asset ke owner hi alert create kr sakte h

    let detection = null;
    if (detectionId) {
        detection = await Detection.findById(detectionId);
        if (!detection) {
            throw new ApiError(404, "Detection not found");
        }
    }
    // agar detectionId provide kiya h to detection ko link krte h

    const platform = inputPlatform || detection?.platform;
    const urlFound = inputUrlFound || detection?.detectedUrl;

    if (!platform || !urlFound) {
        throw new ApiError(400, "platform and urlFound are required (or provide a valid detectionId)");
    }

    const alert = await Alert.create({
        assetId,
        userId: req.user._id,
        // userId automatically set hota h - jo user login h uski ID set hoti h
        detectionId: detectionId || null,
        title,
        description,
        platform,
        urlFound,
        violationType,
        severity,
        // severity: low, medium, high, critical
        status: "open",
        // initially open status - koi action nahi liya abhi
    });

    // Alert.create se alert create hota h aur database me save bhi hota h

    // Asset ke alerts array me newly created alert add krte h
    if (asset.alerts === undefined) {
        asset.alerts = [];
    }
    asset.alerts.push(alert._id);
    await asset.save();

    const createdAlert = await Alert.findById(alert._id)
        .populate("assetId", "_id title fileType")
        .populate("userId", "_id firstName lastName email")
        .populate("detectionId", "_id platform detectedUrl confidence");
    // .populate("assetId", "_id title fileType") - asset ki basic info
    // .populate("userId", "_id firstName lastName email") - user ki info
    // .populate("detectionId", "_id platform detectedUrl confidence") - detection details

    return res.status(201).json(
        new ApiResponse(201, createdAlert, "Alert created successfully")
    );
});

// ===== 2. GET ALL ALERTS (For Current User) =====
export const getAlerts = asyncHandler(async (req, res) => {
    // req.user se userId lete h
    // user ke saare alerts get krte h
    // pagination aur filtering support

    const userId = req.user._id;

    const { page = 1, limit = 10, status, severity, violationType, assetId } = req.query;
    // query parameters: page, limit, status (open/acknowledged/in_progress/resolved/closed), severity, violationType, assetId

    const query = { userId };
    // initially query sirf user ke basis par h

    if (status) {
        query.status = status;
        // agar status filter diya h - open, acknowledged, in_progress, resolved, closed
    }

    if (severity) {
        query.severity = severity;
        // agar severity filter diya h - low, medium, high, critical
    }

    if (violationType) {
        query.violationType = violationType;
        // agar violation type filter diya h - copyright, trademark, impersonation, piracy
    }

    if (assetId) {
        query.assetId = assetId;
        // agar specific asset ke alerts chahiye
    }

    const skip = (page - 1) * limit;

    const alerts = await Alert.find(query)
        .populate("assetId", "_id title")
        .populate("userId", "_id firstName lastName email")
        .populate("detectionId", "_id platform")
        .populate("assignedTo", "_id firstName lastName email")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
    // -1 matlab newest alerts first

    const totalAlerts = await Alert.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                alerts,
                pagination: {
                    total: totalAlerts,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(totalAlerts / limit),
                },
            },
            "Alerts retrieved successfully"
        )
    );
});

// ===== 3. GET SINGLE ALERT =====
export const getAlertById = asyncHandler(async (req, res) => {
    // req.params se alert ID lete h
    // ownership verify krte h
    // alert details return krte h

    const { alertId } = req.params;

    const alert = await Alert.findById(alertId)
        .populate("assetId", "_id title fileType owner")
        .populate("userId", "_id firstName lastName email")
        .populate("detectionId", "_id platform detectedUrl confidence")
        .populate("assignedTo", "_id firstName lastName email");

    if (!alert) {
        throw new ApiError(404, "Alert not found");
    }

    if (alert.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to view this alert");
    }
    // ownership verify kr rhe h

    return res.status(200).json(
        new ApiResponse(200, alert, "Alert retrieved successfully")
    );
});

// ===== 4. UPDATE ALERT STATUS =====
export const updateAlertStatus = asyncHandler(async (req, res) => {
    // req.params se alert ID lete h
    // req.body se new status lete h
    // status: open, acknowledged, in_progress, resolved, closed

    const { alertId } = req.params;
    const { status, notes } = req.body;
    // status = new status
    // notes = admin notes

    if (!status) {
        throw new ApiError(400, "Status is required");
    }

    const alert = await Alert.findById(alertId);

    if (!alert) {
        throw new ApiError(404, "Alert not found");
    }

    if (alert.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this alert");
    }

    // Status update krte h with timestamps
    const oldStatus = alert.status;
    alert.status = status;
    // .status = "acknowledged" / "in_progress" / "resolved" / "closed"

    // Status timestamps set krte h
    if (status === "acknowledged") {
        alert.acknowledgedAt = new Date();
    }

    if (status === "in_progress") {
        alert.inProgressAt = new Date();
    }

    if (status === "resolved") {
        alert.resolvedAt = new Date();
    }

    if (status === "closed") {
        alert.closedAt = new Date();
    }

    if (notes) {
        alert.notes = notes;
    }

    await alert.save();

    const updatedAlert = await Alert.findById(alertId)
        .populate("assetId", "_id title")
        .populate("userId", "_id firstName lastName email")
        .populate("assignedTo", "_id firstName lastName email");

    return res.status(200).json(
        new ApiResponse(200, updatedAlert, `Alert status updated from ${oldStatus} to ${status}`)
    );
});

// ===== 5. ASSIGN ALERT TO ADMIN/STAFF =====
export const assignAlert = asyncHandler(async (req, res) => {
    // alert ko admin/staff member ko assign krte h
    // jo person ye handle karega

    const { alertId } = req.params;
    const { assignedToId } = req.body;
    // assignedToId = admin/staff member ka ID

    if (!assignedToId) {
        throw new ApiError(400, "assignedToId is required");
    }

    const alert = await Alert.findById(alertId);

    if (!alert) {
        throw new ApiError(404, "Alert not found");
    }

    if (alert.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to assign this alert");
    }

    // Check if assigned user exists
    const assignedUser = await User.findById(assignedToId);
    if (!assignedUser) {
        throw new ApiError(404, "Assigned user not found");
    }

    alert.assignedTo = assignedToId;
    alert.assignedAt = new Date();
    await alert.save();

    const updatedAlert = await Alert.findById(alertId)
        .populate("assetId", "_id title")
        .populate("userId", "_id firstName lastName email")
        .populate("assignedTo", "_id firstName lastName email");

    return res.status(200).json(
        new ApiResponse(200, updatedAlert, "Alert assigned successfully")
    );
});

// ===== 6. RECORD DMCA ACTION =====
export const recordDMCAAction = asyncHandler(async (req, res) => {
    // DMCA action log krte h - agar DMCA takedown send kiya to
    // ya content remove ho gya to record krte h

    const { alertId } = req.params;
    const { dmcaSent, copyrightReportFiled, contentRemoved, actionDetails } = req.body;
    // dmcaSent: boolean
    // copyrightReportFiled: boolean
    // contentRemoved: boolean
    // actionDetails: string - kya kiya gya uska description

    const alert = await Alert.findById(alertId);

    if (!alert) {
        throw new ApiError(404, "Alert not found");
    }

    if (alert.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this alert");
    }

    // Action record krte h
    if (dmcaSent) {
        alert.actionTaken.dmcaSent = true;
        alert.actionTaken.dmcaSentDate = new Date();
    }

    if (copyrightReportFiled) {
        alert.actionTaken.copyrightReportFiled = true;
        alert.actionTaken.copyrightReportFiledDate = new Date();
    }

    if (contentRemoved) {
        alert.actionTaken.contentRemoved = true;
        alert.actionTaken.contentRemovedDate = new Date();
        alert.status = "resolved";
        // agar content remove ho gya to alert resolve mark krte h
    }

    if (actionDetails) {
        alert.notes = actionDetails;
    }

    await alert.save();

    const updatedAlert = await Alert.findById(alertId)
        .populate("assetId", "_id title")
        .populate("userId", "_id firstName lastName email");

    return res.status(200).json(
        new ApiResponse(200, updatedAlert, "DMCA action recorded successfully")
    );
});

// ===== 7. ESCALATE ALERT =====
export const escalateAlert = asyncHandler(async (req, res) => {
    // Alert ko escalate krte h - agar serious issue h to
    // higher priority par move krte h

    const { alertId } = req.params;
    const { reason, escalationLevel } = req.body;
    // reason = kyu escalate kr rhe h
    // escalationLevel = 1, 2, 3 (higher = more serious)

    const alert = await Alert.findById(alertId);

    if (!alert) {
        throw new ApiError(404, "Alert not found");
    }

    if (alert.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to escalate this alert");
    }

    // Escalation history me add krte h
    if (alert.escalationHistory === undefined) {
        alert.escalationHistory = [];
    }

    alert.escalationHistory.push({
        escalatedAt: new Date(),
        escalatedBy: req.user._id,
        reason: reason || "Alert escalated",
        previousSeverity: alert.severity,
    });

    // Priority increase krte h
    if (escalationLevel) {
        alert.priority = Math.min(5, (alert.priority || 1) + escalationLevel);
        // priority max 5 ho sakti h
    }

    // Severity increase kr sakte h agar needed ho
    const severityLevels = ["low", "medium", "high", "critical"];
    const currentIndex = severityLevels.indexOf(alert.severity);
    if (currentIndex < severityLevels.length - 1) {
        alert.severity = severityLevels[currentIndex + 1];
    }

    await alert.save();

    const updatedAlert = await Alert.findById(alertId)
        .populate("assetId", "_id title")
        .populate("userId", "_id firstName lastName email");

    return res.status(200).json(
        new ApiResponse(200, updatedAlert, "Alert escalated successfully")
    );
});

// ===== 8. GET OPEN ALERTS (For Dashboard) =====
export const getOpenAlerts = asyncHandler(async (req, res) => {
    // dashboard ke liye sirf open alerts fetch kr rhe h
    // jo still pending h unki list

    const userId = req.user._id;
    const { limit = 10 } = req.query;

    const alerts = await Alert.find({
        userId,
        status: { $in: ["open", "acknowledged", "in_progress"] },
        // open, acknowledged, aur in_progress - ye saare unresolved h
    })
        .populate("assetId", "_id title")
        .populate("detectionId", "_id platform")
        .sort({ priority: -1, createdAt: -1 })
        // priority se sort kr rhe h - highest priority first
        .limit(parseInt(limit));

    return res.status(200).json(
        new ApiResponse(200, alerts, "Open alerts retrieved successfully")
    );
});

// ===== 9. GET ALERT STATISTICS (Dashboard Analytics) =====
export const getAlertStatistics = asyncHandler(async (req, res) => {
    // user ke alerts ka analysis kr rhe h - dashboard stats ke liye

    const userId = req.user._id;

    const totalAlerts = await Alert.countDocuments({ userId });
    // total kitne alerts h

    const openAlerts = await Alert.countDocuments({
        userId,
        status: { $in: ["open", "acknowledged", "in_progress"] },
    });
    // abhi open h - resolve nahi hue

    const resolvedAlerts = await Alert.countDocuments({
        userId,
        status: "resolved",
    });
    // resolved - content remove ho gya

    const closedAlerts = await Alert.countDocuments({
        userId,
        status: "closed",
    });
    // closed - completely finished

    // Severity-wise breakdown
    const alertsBySeverity = await Alert.aggregate([
        { $match: { userId } },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
    ]);
    // har severity level par kitne alerts h

    // Violation type breakdown
    const alertsByViolationType = await Alert.aggregate([
        { $match: { userId } },
        { $group: { _id: "$violationType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);
    // har violation type ke kitne alerts h

    // Status-wise breakdown
    const alertsByStatus = await Alert.aggregate([
        { $match: { userId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            summary: {
                totalAlerts,
                open: openAlerts,
                resolved: resolvedAlerts,
                closed: closedAlerts,
            },
            bySeverity: alertsBySeverity,
            byViolationType: alertsByViolationType,
            byStatus: alertsByStatus,
        })
    );
});

// ===== 10. CLOSE ALERT =====
export const closeAlert = asyncHandler(async (req, res) => {
    // Alert ko close krte h - final step
    // resolved h aur ab close bhi kr rhe h

    const { alertId } = req.params;
    const { closureReason } = req.body;

    const alert = await Alert.findById(alertId);

    if (!alert) {
        throw new ApiError(404, "Alert not found");
    }

    if (alert.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to close this alert");
    }

    alert.status = "closed";
    alert.closedAt = new Date();
    if (closureReason) {
        alert.notes = closureReason;
    }

    await alert.save();

    const closedAlert = await Alert.findById(alertId)
        .populate("assetId", "_id title")
        .populate("userId", "_id firstName lastName email");

    return res.status(200).json(
        new ApiResponse(200, closedAlert, "Alert closed successfully")
    );
});
