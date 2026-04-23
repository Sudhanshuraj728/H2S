// ========== IMPORTS ==========
import mongoose, { Schema } from "mongoose";

// ========== ALERT SCHEMA DEFINITION ==========
// is schema me hum alert ka structure define kr rhe hain
// Alert = ek formal notification jo user ko bheja jaye jab serious violation detect ho
// Detection = raw violation record (har match)
// Alert = serious violation ab action lene ka time aa gaya (user notification)

const alertSchema = new Schema(
    {
        // ========== ALERT TARGET ==========
        // yahan likha h ki alert kis asset ke liye h aur kis user ke liye

        assetId: {
            type: Schema.Types.ObjectId,
            ref: "Asset",
            required: true,
            index: true,
            // assetId = kis asset ke liye alert h
            // ref: "Asset" - Asset model ko reference kr rhe h
        },

        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
            // userId = kis user ko alert dehna h (asset ka owner)
        },

        detectionId: {
            type: Schema.Types.ObjectId,
            ref: "Detection",
            // detectionId = kis specific detection se ye alert generate hua (optional)
            // ek alert ek detection se bhi ja sakta h ya multiple detections se
        },

        // ========== ALERT INFORMATION ==========
        // yahan likha h alert ke baare detailed information

        title: {
            type: String,
            required: true,
            // alert ka heading
            // example: "Copyright Violation Detected on YouTube"
        },

        description: {
            type: String,
            required: true,
            // detailed description of violation
            // example: "Your logo was found in a video uploaded by user XYZ"
        },

        platform: {
            type: String,
            enum: ["youtube", "instagram", "twitter", "facebook", "tiktok", "dailymotion", "other"],
            required: true,
            // kis platform par violation detect hua
        },

        urlFound: {
            type: String,
            required: true,
            // exact URL jahan violation h
        },

        // ========== VIOLATION TYPE & SEVERITY ==========
        // yahan likha h violation ka type aur seriousness

        violationType: {
            type: String,
            enum: ["copyright", "trademark", "impersonation", "piracy", "unauthorized_use"],
            required: true,
            // kaunsa type ka violation h
            // copyright = apna copyright use ho rha h
            // trademark = apna brand name/logo use ho rha h
            // impersonation = fake account se apne naam se content
            // piracy = seedha copy
            // unauthorized_use = permission k bina use
        },

        severity: {
            type: String,
            enum: ["low", "medium", "high", "critical"],
            default: "medium",
            // kitna serious h
            // low = ek bar ho gaya, ignore kr sakte ho
            // medium = action lena chahiye
            // high = urgent action
            // critical = immediately legal action leni chahiye
        },

        // ========== ALERT STATUS & ACTION ==========
        // yahan likha h alert ki current status - kya action liya gaya

        status: {
            type: String,
            enum: ["open", "acknowledged", "in_progress", "resolved", "closed"],
            default: "open",
            // open = naya alert, user ne dekha nahi
            // acknowledged = user ne dekha h
            // in_progress = action chal rhi h (takedown request bhej di)
            // resolved = resolved (content remove ho gyi)
            // closed = alert band (no action needed)
        },

        // ========== ACTION TAKEN ==========
        // yahan likha h kaunsa action liya gaya

        actionTaken: {
            dmcaSent: {
                type: Boolean,
                default: false,
                // DMCA takedown notice bhej di
            },
            dmcaSentDate: Date,
            // kab bhej diya

            copyrightReportFiled: {
                type: Boolean,
                default: false,
                // platform ke paas complaint kiya
            },

            legalActionInitiated: {
                type: Boolean,
                default: false,
                // legal team ko involve kiya
            },

            contentRemoved: {
                type: Boolean,
                default: false,
                // content finally remove ho gyi
            },
            contentRemovedDate: Date,
            // kab remove hui
        },

        // ========== TEMPORAL INFORMATION ==========
        // yahan likha h timing

        createdAt: {
            type: Date,
            default: Date.now,
            index: true,
            // alert kab generate hua
        },

        acknowledgedAt: Date,
        // user ne kab dekha

        resolvedAt: Date,
        // kab resolved hua

        closedAt: Date,
        // kab closed kiya

        // ========== PRIORITY & TRACKING ==========
        // yahan likha h priority aur tracking info

        priority: {
            type: Number,
            default: 1,
            min: 1,
            max: 5,
            // 1 = low priority, 5 = critical priority
            // jisse order of handling decide ho ske
        },

        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: "User",
            // kaunsa user ya admin ko assign kiya gaya handle krne ke liye (optional)
        },

        // ========== METADATA & NOTES ==========
        // extra information

        metadata: {
            firstDetectionDate: Date,
            // pehli baar ye asset detect hua kab
            totalDetectionsOfThisAsset: Number,
            // is asset ke liye total kitne detections hain
            similarViolations: [Schema.Types.ObjectId],
            // similar violations ke detection IDs
        },

        internalNotes: {
            type: String,
            // admin ya team apni internal notes likhe (user ko nahi dikhega)
        },

        userNotes: {
            type: String,
            // user apne notes likhe (internal comments)
        },

        // ========== ESCALATION ==========
        // agar alert escalate krni padi to

        escalationHistory: [
            {
                escalatedAt: Date,
                escalatedBy: Schema.Types.ObjectId,
                // kis ne escalate kiya
                reason: String,
                // kyu escalate kiya
            },
        ],
    },
    {
        timestamps: true,
        // automatically createdAt aur updatedAt fields add ho jayenge
    }
);

// ========== INDEXES FOR PERFORMANCE ==========
alertSchema.index({ userId: 1, status: 1 });
// user ke open alerts jaldi find krnee ke liye

alertSchema.index({ severity: 1, status: 1 });
// critical alerts jaldi find krnee ke liye

alertSchema.index({ createdAt: -1 });
// newest alerts first dikhane ke liye

alertSchema.index({ assetId: 1, status: 1 });
// kisi asset ke sare alerts find krnee ke liye

// ========== EXPORT ==========
export const Alert = mongoose.model("Alert", alertSchema);

// Alert model ban gaya - jab serious violation detect ho aur user ko notify krna h tab is model me entry ban jayegi
// Asset model mein alerts array mein in IDs ko store kiya jata hai
