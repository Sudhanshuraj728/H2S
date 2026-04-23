// ========== IMPORTS ==========
import { Router } from "express";
// Router use kr rhe h Express se - endpoints create krne ke liye

import { verifyJWT } from "../middleware/auth.middleware.js";
// verifyJWT middleware se authentication check krte h - sirf login user access kr sake

import {
    createAlert,
    getAlerts,
    getAlertById,
    updateAlertStatus,
    assignAlert,
    recordDMCAAction,
    escalateAlert,
    getOpenAlerts,
    getAlertStatistics,
    closeAlert,
} from "../controllers/alert.controller.js";
// saare controller functions import kr rhe h

// ========== ROUTER INITIALIZATION ==========
const router = Router();
// Express Router instance create kr rhe h

// ========== PROTECTED ROUTES (User Authentication Required) ==========
// Saare routes protected h - verifyJWT middleware se

// ===== 1. CREATE ALERT =====
router.post("/", verifyJWT, createAlert);
// POST /api/alerts
// Body: { assetId, detectionId (optional), title, description, violationType, severity }
// Response: Alert object with populated asset, user, and detection details
// Kab call hota: jab serious violation detected ho aur user ko notify krna ho

// ===== 2. GET ALL ALERTS (User ke saare alerts) =====
router.get("/", verifyJWT, getAlerts);
// GET /api/alerts
// Query Params: page=1, limit=10, status=open, severity=high, violationType=copyright, assetId=xyz
// Response: Array of alerts with pagination metadata
// Kab call hota: user apne saare alerts dekhne ke liye
// Filter support: status (open/acknowledged/in_progress/resolved/closed), severity, violationType, assetId

// ===== 3. GET ALERT STATISTICS (Dashboard) =====
router.get("/stats", verifyJWT, getAlertStatistics);
// GET /api/alerts/stats
// Response: { summary, bySeverity, byViolationType, byStatus }
// summary: { totalAlerts, open, resolved, closed }
// bySeverity: Array of {_id: severity, count: number}
// byViolationType: Array of {_id: violationType, count: number}
// byStatus: Array of {_id: status, count: number}
// Kab call hota: dashboard page load hone par analytics dikhane ke liye

// ===== 4. GET OPEN ALERTS (For Dashboard Widget) =====
router.get("/open", verifyJWT, getOpenAlerts);
// GET /api/alerts/open
// Query Params: limit=10
// Response: Array of open/unresolved alerts (sorted by priority)
// Kab call hota: dashboard widget me pending alerts dikhane ke liye

// ===== 5. GET SINGLE ALERT =====
router.get("/:alertId", verifyJWT, getAlertById);
// GET /api/alerts/123abc
// Response: Single alert object with all populated fields
// Kab call hota: alert ke complete details dekhne ke liye
// Ownership check: sirf user apne alert hi dekh sakta h

// ===== 6. UPDATE ALERT STATUS =====
router.put("/:alertId/status", verifyJWT, updateAlertStatus);
// PUT /api/alerts/123abc/status
// Body: { status: "in_progress", notes: "..." }
// Response: Updated alert object
// Status options: "open", "acknowledged", "in_progress", "resolved", "closed"
// Kab call hota: alert ka status change krne ke liye

// ===== 7. ASSIGN ALERT =====
router.post("/:alertId/assign", verifyJWT, assignAlert);
// POST /api/alerts/123abc/assign
// Body: { assignedToId: "admin_user_id" }
// Response: Updated alert with assignedTo field
// Kab call hota: alert ko admin/staff member ko assign krne ke liye

// ===== 8. RECORD DMCA ACTION =====
router.post("/:alertId/dmca", verifyJWT, recordDMCAAction);
// POST /api/alerts/123abc/dmca
// Body: { dmcaSent: true, copyrightReportFiled: true, contentRemoved: true, actionDetails: "..." }
// Response: Updated alert with actionTaken details
// Kab call hota: jab DMCA takedown ya copyright action le lete h

// ===== 9. ESCALATE ALERT =====
router.post("/:alertId/escalate", verifyJWT, escalateAlert);
// POST /api/alerts/123abc/escalate
// Body: { reason: "Repeated violation", escalationLevel: 2 }
// Response: Updated alert with escalation history and increased priority
// Kab call hota: jab alert ko higher priority par move krna ho

// ===== 10. CLOSE ALERT =====
router.post("/:alertId/close", verifyJWT, closeAlert);
// POST /api/alerts/123abc/close
// Body: { closureReason: "Content removed successfully" }
// Response: Closed alert object
// Kab call hota: jab alert completely resolve ho jaye aur close krna ho

// ========== EXPORT ==========
export default router;
// alert routes export kr rhe h - app.js me mount krne ke liye
