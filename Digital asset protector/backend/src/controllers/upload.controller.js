import fs from "fs";
import runPython from "../utils/runpython.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Asset } from "../models/asset.model.js";
import { Detection } from "../models/detection.model.js";
import { Alert } from "../models/alert.model.js";

const ALERT_THRESHOLD = 12;

const toNumber = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
};

const severityFromScore = (score) => {
    if (score >= 18) return "critical";
    if (score >= 15) return "high";
    if (score >= 12) return "medium";
    return "low";
};

const buildMatchMetrics = (bestMatch) => ({
    globalHashSimilarity: toNumber(bestMatch?.global_hash_similarity),
    colourSimilarity: toNumber(bestMatch?.colour_similarity),
    cropSimilarity: toNumber(bestMatch?.crop_similarity),
    orbSimilarity: toNumber(bestMatch?.orb_similarity),
    ahashSimilarity: toNumber(bestMatch?.ahash_similarity),
    phashSimilarity: toNumber(bestMatch?.phash_similarity),
    dhashSimilarity: toNumber(bestMatch?.dhash_similarity),
    scenarioStandardMatch: toNumber(bestMatch?.scenario_standard_match),
    scenarioCropMatch: toNumber(bestMatch?.scenario_crop_match),
    scenarioStructuralMatch: toNumber(bestMatch?.scenario_structural_match),
    scenarioHeavyTransformMatch: toNumber(bestMatch?.scenario_heavy_transform_match),
    combinedSimilarityPercentage: toNumber(bestMatch?.combined_similarity_percentage),
    similarityScoreOutOf20: toNumber(bestMatch?.similarity_score_out_of_20),
    matchStatus: bestMatch?.match_status || "no_match",
});

const ensureLinkedAsset = async ({ userId, bestMatch, sourceType }) => {
    const externalId = bestMatch?.matched_asset_id || "unknown";
    const publicId = bestMatch?.matched_public_id || "UNKNOWN";
    const matchedFilename = bestMatch?.matched_filename || "unknown";
    const assetHash = `logic-${externalId}-${userId}`;

    let asset = await Asset.findOne({ fileHash: assetHash });

    if (!asset) {
        asset = await Asset.create({
            title: matchedFilename,
            description: `Linked from logic engine asset ${publicId}`,
            fileUrl: `logic://asset/${publicId}`,
            fileHash: assetHash,
            fileType: sourceType === "video" ? "video" : "image",
            fileSize: 0,
            owner: userId,
            status: "active",
            isProtected: true,
            platforms: ["other"],
            filename: matchedFilename,
            source: "logic-engine",
            hash: externalId,
        });
    }

    return asset;
};

export const uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "No file uploaded");
    }

    const filePath = req.file.path;

    try {
        const comparisonResult = await runPython(filePath);

        if (comparisonResult?.error) {
            throw new ApiError(500, comparisonResult.error);
        }

        const bestMatch = comparisonResult?.best_match;

        if (!bestMatch) {
            return res.status(200).json({
                status: "no_match",
                ...comparisonResult,
            });
        }

        const userId = req.user?._id;
        if (!userId) {
            throw new ApiError(401, "Unauthorized request");
        }

        const sourceFileName = comparisonResult?.source_file_name || req.file.originalname;
        const sourceType = comparisonResult?.source_type || "image";
        const matchMetrics = buildMatchMetrics(bestMatch);
        const combinedSimilarityPercentage = matchMetrics.combinedSimilarityPercentage;
        const similarityScoreOutOf20 = matchMetrics.similarityScoreOutOf20;
        const shouldCreateAlert = similarityScoreOutOf20 >= ALERT_THRESHOLD;

        const linkedAsset = await ensureLinkedAsset({ userId, bestMatch, sourceType });

        const detection = await Detection.create({
            assetId: linkedAsset._id,
            userId,
            detectedUrl: `upload://${sourceFileName}`,
            platform: "other",
            confidence: Math.round(combinedSimilarityPercentage),
            matchScore: Math.round((similarityScoreOutOf20 / 20) * 100),
            thumbnailUrl: null,
            status: shouldCreateAlert ? "pending" : "false_positive",
            sourceFileName,
            sourceType,
            matchedAssetExternalId: bestMatch?.matched_asset_id,
            matchedPublicId: bestMatch?.matched_public_id,
            matchedFilename: bestMatch?.matched_filename,
            combinedSimilarityPercentage,
            similarityScoreOutOf20,
            matchMetrics,
            metadata: {
                description: `Match status: ${matchMetrics.matchStatus}`,
            },
        });

        linkedAsset.detectionCount = (linkedAsset.detectionCount || 0) + 1;
        linkedAsset.lastDetectedAt = new Date();
        linkedAsset.detections = linkedAsset.detections || [];
        linkedAsset.detections.push(detection._id);

        let createdAlert = null;

        if (shouldCreateAlert) {
            createdAlert = await Alert.create({
                assetId: linkedAsset._id,
                userId,
                detectionId: detection._id,
                title: `Potential infringement detected (${matchMetrics.matchStatus})`,
                description: `${sourceFileName} matched ${bestMatch?.matched_filename} with ${combinedSimilarityPercentage}% similarity`,
                platform: "other",
                urlFound: `upload://${sourceFileName}`,
                violationType: "unauthorized_use",
                severity: severityFromScore(similarityScoreOutOf20),
                status: "open",
                sourceFileName,
                sourceType,
                matchedAssetExternalId: bestMatch?.matched_asset_id,
                matchedPublicId: bestMatch?.matched_public_id,
                matchedFilename: bestMatch?.matched_filename,
                matchMetrics,
                metadata: {
                    firstDetectionDate: new Date(),
                    totalDetectionsOfThisAsset: linkedAsset.detectionCount,
                },
            });

            linkedAsset.status = "flagged";
            linkedAsset.alerts = linkedAsset.alerts || [];
            linkedAsset.alerts.push(createdAlert._id);
        }

        await linkedAsset.save();

        return res.status(200).json({
            status: shouldCreateAlert ? "match" : "no_match",
            ...comparisonResult,
            detectionId: detection._id,
            alertId: createdAlert?._id || null,
            alertCreated: Boolean(createdAlert),
        });
    } catch (error) {
        throw new ApiError(500, error?.message || "Detection failed");
    } finally {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
});
