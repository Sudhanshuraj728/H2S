// ========== IMPORTS ==========
import mongoose, { Schema } from "mongoose";

// ========== DETECTION SCHEMA DEFINITION ==========
// is schema me hum detection ka structure define kr rhe hain
// jab kisi asset ko internet par kisi dusre jagah dusri jagah upload dekh jaye tab Detection record ban jayega
// example: agar GuardMark logo YouTube pe mil gaya to yeh ek Detection h

const detectionSchema = new Schema(
    {
        // ========== DETECTION TARGET ==========
        // yahan likha h ki kaunsi asset detect hui aur kaunsे user ki h

        assetId: {
            type: Schema.Types.ObjectId,
            ref: "Asset",
            required: true,
            index: true,
            // assetId = kis asset ka violation detect hua
            // ref: "Asset" - Asset model ko reference kr rhe h
            // required: true - har detection ke liye asset jaruri h
            // index: true - jaldi search ho sake
        },

        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
            // userId = kis user ka asset h (asset ka owner)
            // populate use krke asset se user ID bhut skte hain par redundancy ke liye explicitly likha h
        },

        // ========== DETECTION LOCATION ==========
        // yahan likha h ki asset kahan detect hua - URL aur platform

        detectedUrl: {
            type: String,
            required: true,
            // detectedUrl = puri URL jahan asset detect hua
            // example: https://www.youtube.com/watch?v=abc123xyz
        },

        platform: {
            type: String,
            enum: ["youtube", "instagram", "twitter", "facebook", "tiktok", "dailymotion", "other"],
            required: true,
            // platform = kis platform par detect hua
            // enum se sirf yeh platforms allowed hain
        },

        // ========== DETECTION DETAILS ==========
        // yahan likha h detection ke baare mein details - confidence, match score

        confidence: {
            type: Number,
            default: 95,
            min: 0,
            max: 100,
            // confidence = kitne percent match hua original asset se
            // example: 95 matlab 95% match h - bilkul same file h
            // min: 0, max: 100 se sirf 0-100 ke beech value ho sakti h
        },

        matchScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
            // matchScore = similarity score fingerprint matching se
            // sometimes confidence aur matchScore alag alag ho skte hain
        },

        thumbnailUrl: {
            type: String,
            // detected content ka thumbnail - jisse pata chale kya detect hua
            // optional h kyuki har platform pe thumbnail available nahi
        },

        sourceFileName: {
            type: String,
            // scanned input filename from logic engine
        },

        sourceType: {
            type: String,
            enum: ["image", "video", "video_frame", "other"],
            default: "image",
            // scanned input type
        },

        matchedAssetExternalId: {
            type: String,
            // UUID/reference received from logic detection engine
        },

        matchedPublicId: {
            type: String,
            // ASSET-XXXXXXXX style public ID from logic detection engine
        },

        matchedFilename: {
            type: String,
            // matched asset filename returned by logic detection engine
        },

        combinedSimilarityPercentage: {
            type: Number,
            min: 0,
            max: 100,
            // best scenario similarity percentage (0-100)
        },

        similarityScoreOutOf20: {
            type: Number,
            min: 0,
            max: 20,
            // similarity score from logic engine in 0-20 scale
        },

        matchMetrics: {
            globalHashSimilarity: Number,
            colourSimilarity: Number,
            cropSimilarity: Number,
            orbSimilarity: Number,
            ahashSimilarity: Number,
            phashSimilarity: Number,
            dhashSimilarity: Number,
            scenarioStandardMatch: Number,
            scenarioCropMatch: Number,
            scenarioStructuralMatch: Number,
            scenarioHeavyTransformMatch: Number,
            combinedSimilarityPercentage: Number,
            similarityScoreOutOf20: Number,
            matchStatus: {
                type: String,
                enum: ["identical", "strong", "partial", "weak", "no_match"],
            },
        },

        // ========== DETECTION STATUS ==========
        // yahan likha h detection ki current status - kya action liya gaya

        status: {
            type: String,
            enum: ["pending", "reported", "resolved", "false_positive"],
            default: "pending",
            // pending = abhi koi action nahi liya
            // reported = DMCA takedown ya complaint report kiya
            // resolved = takedown successful ya removed
            // false_positive = ye violation nahi tha
        },

        // ========== TEMPORAL INFORMATION ==========
        // yahan likha h timing information - kab detect hua

        detectionDate: {
            type: Date,
            default: Date.now,
            index: true,
            // detectionDate = kab detect hua - automatic current time set hota h
            // index: true iska matlab jaldi sort kar skte hain recent detections ke liye
        },

        reportedDate: {
            type: Date,
            // kab report kiya gaya (optional - pending h to ye null)
        },

        resolvedDate: {
            type: Date,
            // kab resolved hua (optional - resolved h tab ye date set hoti h)
        },

        // ========== METADATA & ADDITIONAL INFO ==========
        // extra information jo useful ho sakti h future mein

        metadata: {
            uploadedBy: String,
            // kis ne detected content upload kiya
            viewCount: Number,
            // detected content ko kitne log dekh chuke hain
            likeCount: Number,
            // like count (agar platform se mil sake)
            description: String,
            // detected content ka description
        },

        notes: {
            type: String,
            // admin ya user apni notes daal sakte hain
            // example: "DMCA sent to YouTube, waiting for response"
        },

        reportDetails: {
            reportType: {
                type: String,
                enum: ["dmca", "copyright", "trademark", "impersonation", "manual"],
                // kis tarah ki report bhej, manual matlab manually file ki ho
            },
            reportedTo: String,
            // kisko report kiya - "YouTube", "Instagram", etc.
            caseNumber: String,
            // DMCA case number ya ticket number
            response: String,
            // platform ka response
        },
    },
    {
        timestamps: true,
        // automatically createdAt aur updatedAt fields add ho jayenge
    }
);

// ========== INDEXES FOR PERFORMANCE ==========
detectionSchema.index({ assetId: 1, status: 1 });
// kisi asset ke sare detections jaldi find krnee ke liye

detectionSchema.index({ userId: 1, detectionDate: -1 });
// user ke recent detections jaldi find krnee ke liye

detectionSchema.index({ platform: 1, status: 1 });
// specific platform par pending detections find krnee ke liye

// ========== EXPORT ==========
export const Detection = mongoose.model("Detection", detectionSchema);

// Detection model ban gaya - jab bhi asset kahin detect ho tab is model me entry ban jayegi
// Asset model mein detections array mein in IDs ko store kiya jata hai
