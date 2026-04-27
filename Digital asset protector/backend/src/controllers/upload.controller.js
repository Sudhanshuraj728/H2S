import fs from "fs";
import runPython from "../utils/runpython.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Asset } from "../models/asset.model.js";
import { Detection } from "../models/detection.model.js";
import { Alert } from "../models/alert.model.js";

const ALERT_THRESHOLD = 10;

const toNumber = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
};

const isFiniteNumber = (value) => Number.isFinite(Number(value));

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

const shouldGenerateAlertFromMetrics = (metrics) => {
    const hasRequiredCoreMetrics = [
        metrics?.globalHashSimilarity,
        metrics?.colourSimilarity,
        metrics?.cropSimilarity,
        metrics?.orbSimilarity,
        metrics?.ahashSimilarity,
        metrics?.phashSimilarity,
        metrics?.dhashSimilarity,
        metrics?.combinedSimilarityPercentage,
    ].every(isFiniteNumber);

    if (!hasRequiredCoreMetrics) {
        return false;
    }

    const normalizedStatus = String(metrics?.matchStatus || "no_match").toLowerCase();

    if (["identical", "strong", "partial"].includes(normalizedStatus)) {
        return true;
    }

    const similarityScoreOutOf20 = toNumber(metrics?.similarityScoreOutOf20, 0);
    const combinedSimilarityPercentage = toNumber(metrics?.combinedSimilarityPercentage, 0);
    const scenarioCropMatch = toNumber(metrics?.scenarioCropMatch, 0);
    const scenarioRegionMatch = toNumber(metrics?.scenarioRegionMatch, 0);
    const scenarioHeavyTransformMatch = toNumber(metrics?.scenarioHeavyTransformMatch, 0);

    // Score >= 10 out of 20 covers partial/crop matches
    if (similarityScoreOutOf20 >= ALERT_THRESHOLD) {
        return true;
    }

    // Crop scenario >= 30% = tile + ORB signal
    if (scenarioCropMatch >= 30) {
        return true;
    }

    // Region match >= 35%: the crop's hash matches a sub-tile of the original
    if (scenarioRegionMatch >= 35) {
        return true;
    }

    if (combinedSimilarityPercentage >= 45) {
        return true;
    }

    return toNumber(metrics?.orbSimilarity, 0) >= 0.5 && scenarioHeavyTransformMatch >= 40;
};

const isTransformedExistingMatch = (metrics) => {
    const cropScenario = toNumber(metrics?.scenarioCropMatch, 0);
    const regionScenario = toNumber(metrics?.scenarioRegionMatch, 0);
    const structuralScenario = toNumber(metrics?.scenarioStructuralMatch, 0);
    const heavyTransformScenario = toNumber(metrics?.scenarioHeavyTransformMatch, 0);
    const orbSimilarity = toNumber(metrics?.orbSimilarity, 0);
    const regionSimilarity = toNumber(metrics?.regionSimilarity, 0);
    const cropSimilarity = toNumber(metrics?.cropSimilarity, 0);
    const globalSimilarity = toNumber(metrics?.globalHashSimilarity, 0);
    const combinedSimilarity = toNumber(metrics?.combinedSimilarityPercentage, 0);

    const hasScenarioSignal =
        cropScenario >= 25 ||           // tile+ORB crop match
        regionScenario >= 30 ||         // query hash matches an asset tile (the crop region)
        structuralScenario >= 30 ||
        heavyTransformScenario >= 30 ||
        (orbSimilarity >= 0.20 && (cropScenario >= 20 || regionScenario >= 25));

    const hasSupportSignal =
        regionSimilarity >= 0.40 ||     // query's hash matches one of the asset's tile hashes
        cropSimilarity >= 0.10 ||
        globalSimilarity >= 0.18 ||
        orbSimilarity >= 0.20 ||
        combinedSimilarity >= 30;

    return hasScenarioSignal && hasSupportSignal;
};

const buildSourceAssetHash = ({ userId, sourceHashes, sourceFileName, fileSize }) => {
    const ahash = sourceHashes?.ahash || "na";
    const phash = sourceHashes?.phash || "na";
    const dhash = sourceHashes?.dhash || "na";
    return `upload-${userId}-${ahash}-${phash}-${dhash}-${sourceFileName}-${fileSize || 0}`;
};

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

        const userId = req.user?._id;
        if (!userId) {
            throw new ApiError(401, "Unauthorized request");
        }

        const bestMatch = comparisonResult?.best_match;
        const sourceFileName = comparisonResult?.source_file_name || req.file.originalname;
        const sourceType = comparisonResult?.source_type || "image";
        const sourceHashes = comparisonResult?.source_hashes || {};

        if (!bestMatch) {
            const sourceAssetHash = buildSourceAssetHash({
                userId,
                sourceHashes,
                sourceFileName,
                fileSize: req.file?.size,
            });

            const createdAsset = await Asset.create({
                title: sourceFileName,
                description: `Protected upload for ${sourceFileName}`,
                fileUrl: `upload://${sourceFileName}`,
                fileHash: sourceAssetHash,
                fileType: sourceType === "video" ? "video" : "image",
                fileSize: req.file?.size || 0,
                owner: userId,
                status: "active",
                isProtected: true,
                platforms: ["other"],
                filename: sourceFileName,
                source: "user-upload",
                ahash: sourceHashes?.ahash || null,
                phash: sourceHashes?.phash || null,
                dhash: sourceHashes?.dhash || null,
                colorhash: sourceHashes?.colorhash || null,
            });

            return res.status(200).json({
                status: "no_match",
                ...comparisonResult,
                matchedFilename: null,
                confidence: 0,
                uploadedAssetId: createdAsset?._id || null,
                alertCreated: false,
            });
        }

        const matchMetrics = buildMatchMetrics(bestMatch);
        const combinedSimilarityPercentage = matchMetrics.combinedSimilarityPercentage;
        const similarityScoreOutOf20 = matchMetrics.similarityScoreOutOf20;
        const shouldCreateAlert = shouldGenerateAlertFromMetrics(matchMetrics);
        const transformedExistingMatch = isTransformedExistingMatch(matchMetrics);
        const isExistingMatch = shouldCreateAlert || transformedExistingMatch;
        const normalizedMatchStatus = String(matchMetrics.matchStatus || "no_match").toLowerCase();
        const isDuplicateUpload = ["identical", "strong", "partial"].includes(normalizedMatchStatus) || isExistingMatch;

        let createdUploadedAsset = null;
        if (!isDuplicateUpload) {
            const sourceAssetHash = buildSourceAssetHash({
                userId,
                sourceHashes,
                sourceFileName,
                fileSize: req.file?.size,
            });

            createdUploadedAsset = await Asset.findOne({ fileHash: sourceAssetHash, owner: userId });

            if (!createdUploadedAsset) {
                createdUploadedAsset = await Asset.create({
                    title: sourceFileName,
                    description: `Protected upload for ${sourceFileName}`,
                    fileUrl: `upload://${sourceFileName}`,
                    fileHash: sourceAssetHash,
                    fileType: sourceType === "video" ? "video" : "image",
                    fileSize: req.file?.size || 0,
                    owner: userId,
                    status: "active",
                    isProtected: true,
                    platforms: ["other"],
                    filename: sourceFileName,
                    source: "user-upload",
                    ahash: sourceHashes?.ahash || null,
                    phash: sourceHashes?.phash || null,
                    dhash: sourceHashes?.dhash || null,
                    colorhash: sourceHashes?.colorhash || null,
                });
            }
        }

        const linkedAsset = await ensureLinkedAsset({ userId, bestMatch, sourceType });

        const detection = await Detection.create({
            assetId: linkedAsset._id,
            userId,
            detectedUrl: `upload://${sourceFileName}`,
            platform: "other",
            confidence: Math.round(combinedSimilarityPercentage),
            matchScore: Math.round((similarityScoreOutOf20 / 20) * 100),
            thumbnailUrl: null,
            status: isExistingMatch ? "pending" : "false_positive",
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
            status: isExistingMatch ? "match" : "no_match",
            ...comparisonResult,
            matchedFilename: bestMatch?.matched_filename || null,
            confidence: combinedSimilarityPercentage,
            detectionId: detection._id,
            alertId: createdAlert?._id || null,
            alertCreated: Boolean(createdAlert),
            uploadedAssetId: createdUploadedAsset?._id || null,
            isDuplicate: isDuplicateUpload,
            transformedMatchDetected: transformedExistingMatch,
        });
    } catch (error) {
        throw new ApiError(500, error?.message || "Detection failed");
    } finally {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
});
