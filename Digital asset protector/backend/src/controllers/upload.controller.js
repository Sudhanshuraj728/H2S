import fs from "fs";
import path from "path";
import runPython from "../utils/runpython.js";
import registerAsset from "../utils/registerAsset.js";
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
    regionSimilarity: toNumber(bestMatch?.region_similarity),
    ahashSimilarity: toNumber(bestMatch?.ahash_similarity),
    phashSimilarity: toNumber(bestMatch?.phash_similarity),
    dhashSimilarity: toNumber(bestMatch?.dhash_similarity),
    scenarioStandardMatch: toNumber(bestMatch?.scenario_standard_match),
    scenarioCropMatch: toNumber(bestMatch?.scenario_crop_match),
    scenarioRegionMatch: toNumber(bestMatch?.scenario_region_match),
    scenarioStructuralMatch: toNumber(bestMatch?.scenario_structural_match),
    scenarioHeavyTransformMatch: toNumber(bestMatch?.scenario_heavy_transform_match),
    combinedSimilarityPercentage: toNumber(bestMatch?.combined_similarity_percentage),
    similarityScoreOutOf20: toNumber(bestMatch?.similarity_score_out_of_20),
    matchStatus: bestMatch?.match_status || "no_match",
    transformationType: bestMatch?.transformation_type || "none",
    isCrop: Boolean(bestMatch?.is_crop),
    isContrast: Boolean(bestMatch?.is_contrast),
});

/**
 * Determines if an alert should be generated based on match metrics.
 * FIXED: No longer requires ALL core metrics to be present — uses score-based logic instead.
 */
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

/**
 * Detects if this is a transformed version of an existing asset (crop, contrast, etc.)
 */
const isTransformedExistingMatch = (metrics) => {
    const cropScenario = toNumber(metrics?.scenarioCropMatch, 0);
    const regionScenario = toNumber(metrics?.scenarioRegionMatch, 0);
    const structuralScenario = toNumber(metrics?.scenarioStructuralMatch, 0);
    const orbSimilarity = toNumber(metrics?.orbSimilarity, 0);
    const regionSimilarity = toNumber(metrics?.regionSimilarity, 0);
    const cropSimilarity = toNumber(metrics?.cropSimilarity, 0);
    const globalSimilarity = toNumber(metrics?.globalHashSimilarity, 0);
    const combinedSimilarity = toNumber(metrics?.combinedSimilarityPercentage, 0);

    // Require MULTIPLE strong signals to agree — prevents false positives.
    // A random unrelated image will have low scores on ALL of these.
    // A true crop/transform will have at least 2-3 elevated signals.
    let signals = 0;
    if (cropScenario >= 45)    signals++;  // tile-based crop match
    if (regionScenario >= 50)  signals++;  // global hash matches a tile region
    if (regionSimilarity >= 0.55) signals++; // direct tile hash overlap
    if (cropSimilarity >= 0.45)  signals++; // tile similarity
    if (globalSimilarity >= 0.35) signals++; // some global hash overlap
    if (orbSimilarity >= 0.40)   signals++; // feature matching
    if (combined >= 50)          signals++; // overall combined
    if (structuralScenario >= 45) signals++; // structural match

    // Need at least 2 independent signals to confirm a transformed match
    return signals >= 2;
};

const buildSourceAssetHash = ({ userId, sourceHashes, sourceFileName, fileSize }) => {
    const ahash = sourceHashes?.ahash || "na";
    const phash = sourceHashes?.phash || "na";
    const dhash = sourceHashes?.dhash || "na";
    return `upload-${userId}-${ahash}-${phash}-${dhash}-${sourceFileName}-${fileSize || 0}`;
};

/**
 * Check if this exact image (by perceptual hash) already exists in the user's assets.
 * This prevents re-uploading the exact same image to the DB.
 */
const findExistingAssetByHash = async (userId, sourceHashes) => {
    if (!sourceHashes?.ahash || !sourceHashes?.phash || !sourceHashes?.dhash) {
        return null;
    }
    // Look for an asset with matching perceptual hashes owned by this user
    return Asset.findOne({
        owner: userId,
        ahash: sourceHashes.ahash,
        phash: sourceHashes.phash,
        dhash: sourceHashes.dhash,
    });
};

// ─── MongoDB-Level Perceptual Hash Scanning ───
// This bridges the gap between the Python engine's local JSON DB and MongoDB.
// When an image was registered on another system, the Python engine won't find it,
// but these functions search MongoDB directly using the computed hashes.

/**
 * Compute Hamming similarity between two hex hash strings (0.0 to 1.0).
 * Compares character-by-character (each hex char = 4 bits).
 * Maps distance from [0, maxDist/2] → [1.0, 0.0] (50% is random chance = 0.0).
 */
const hexHammingSimilarity = (hex1, hex2) => {
    if (!hex1 || !hex2 || hex1.length !== hex2.length) return 0.0;
    let diffBits = 0;
    for (let i = 0; i < hex1.length; i++) {
        const v1 = parseInt(hex1[i], 16);
        const v2 = parseInt(hex2[i], 16);
        if (isNaN(v1) || isNaN(v2)) return 0.0;
        let xor = v1 ^ v2;
        while (xor) { diffBits += xor & 1; xor >>= 1; }
    }
    const totalBits = hex1.length * 4;
    const threshold = totalBits / 2.0;
    const sim = 1.0 - (diffBits / threshold);
    return Math.max(0.0, sim);
};

/**
 * Compute a combined perceptual similarity score between uploaded hashes and a DB asset.
 * Uses the same weighting as the Python engine: aHash 20%, pHash 50%, dHash 30%.
 * Returns { similarity (0-1), score (0-20), matchType: "Original"|"Cropped"|"Transformed" }
 */
const computeMongoSimilarity = (sourceHashes, dbAsset) => {
    const sa = hexHammingSimilarity(sourceHashes.ahash, dbAsset.ahash);
    const sp = hexHammingSimilarity(sourceHashes.phash, dbAsset.phash);
    const sd = hexHammingSimilarity(sourceHashes.dhash, dbAsset.dhash);
    const globalCombined = (sa * 0.20) + (sp * 0.50) + (sd * 0.30);

    // Color hash similarity (if available)
    let colorSim = 0.0;
    if (sourceHashes.colorhash && dbAsset.colorhash) {
        colorSim = hexHammingSimilarity(sourceHashes.colorhash, dbAsset.colorhash);
    }

    // Weighted final: 70% global hash + 30% color
    const finalSim = (globalCombined * 0.70) + (colorSim * 0.30);
    const score = finalSim * 20.0;

    // Determine match type
    let matchType = "Transformed";
    if (sa >= 0.95 && sp >= 0.95 && sd >= 0.95) {
        matchType = "Original";
    } else if (globalCombined >= 0.85 && colorSim >= 0.70) {
        matchType = "Original";
    } else if (globalCombined < 0.65 && (sa >= 0.40 || sp >= 0.40 || sd >= 0.40)) {
        matchType = "Cropped";
    }

    return {
        similarity: finalSim,
        score,
        matchType,
        ahashSim: sa,
        phashSim: sp,
        dhashSim: sd,
        colorSim,
        globalCombined,
    };
};

/**
 * Search ALL assets in MongoDB for perceptual hash matches.
 * This is the critical fix: scans the MongoDB vault regardless of the Python engine result.
 * Returns the best matching asset with similarity info, or null.
 */
const findBestMatchInMongoDB = async (sourceHashes) => {
    if (!sourceHashes?.ahash || !sourceHashes?.phash || !sourceHashes?.dhash) {
        console.log("[MongoScan] Skipped — source hashes missing");
        return null;
    }

    // Fetch all assets that have perceptual hashes stored
    // Use $nin to exclude null, undefined, and empty string
    const allAssets = await Asset.find({
        ahash: { $nin: [null, "", undefined] },
        phash: { $nin: [null, "", undefined] },
        dhash: { $nin: [null, "", undefined] },
    }).select('title filename ahash phash dhash colorhash owner source').lean();

    console.log(`[MongoScan] Scanning ${allAssets.length} assets with hashes...`);

    let bestMatch = null;
    let bestSimilarity = 0;

    for (const asset of allAssets) {
        if (!asset.ahash || !asset.phash || !asset.dhash) continue;

        const result = computeMongoSimilarity(sourceHashes, asset);

        // Only consider matches above a meaningful threshold (score >= 12/20 = 60%)
        if (result.score >= 12 && result.similarity > bestSimilarity) {
            bestSimilarity = result.similarity;
            bestMatch = {
                asset,
                ...result,
            };
        }
    }

    if (bestMatch) {
        console.log(`[MongoScan] Best match: ${bestMatch.asset.filename || bestMatch.asset.title} (similarity=${(bestMatch.similarity * 100).toFixed(1)}%, score=${bestMatch.score.toFixed(1)}/20, type=${bestMatch.matchType})`);
    } else {
        console.log("[MongoScan] No match above threshold found");
    }

    return bestMatch;
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

/**
 * Build the alert title with transformation context
 */
const buildAlertTitle = (metrics, matchStatus) => {
    if (metrics?.isCrop) {
        return `Cropped image detected (${matchStatus})`;
    }
    if (metrics?.isContrast) {
        return `Contrast-modified image detected (${matchStatus})`;
    }
    const transformationType = metrics?.transformationType || "none";
    if (transformationType === "heavy_transform") {
        return `Heavily transformed match detected (${matchStatus})`;
    }
    if (transformationType === "exact") {
        return `Exact duplicate detected (${matchStatus})`;
    }
    if (transformationType === "near_exact") {
        return `Near-exact match detected (${matchStatus})`;
    }
    return `Potential infringement detected (${matchStatus})`;
};

/**
 * Build the alert description with transformation context
 */
const buildAlertDescription = (sourceFileName, matchedFilename, combinedSimilarityPercentage, metrics) => {
    let desc = `${sourceFileName} matched ${matchedFilename} with ${combinedSimilarityPercentage}% similarity`;
    if (metrics?.isCrop) {
        desc += ` — Image appears to be a CROPPED version of the original`;
    } else if (metrics?.isContrast) {
        desc += ` — Image appears to have CONTRAST/COLOR modifications`;
    } else if (metrics?.transformationType === "heavy_transform") {
        desc += ` — Image has been heavily transformed (rotation, filter, etc.)`;
    }
    return desc;
};

export const uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "No file uploaded");
    }

    const filePath = req.file.path;

    try {
        // Fetch all MongoDB assets that have hashes so Python can compare against them.
        // This makes MongoDB the single source of truth — assets.json is never used.
        const mongoAssets = await Asset.find(
            { ahash: { $exists: true, $ne: null } },
            "_id filename title ahash phash dhash colorhash tileHashes fileType fileSize"
        ).lean();

        const comparisonResult = await runPython(filePath, mongoAssets);

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

        // ─── DEBUG: Log the matching pipeline ───
        console.log("\n========== UPLOAD MATCH PIPELINE ==========");
        console.log("File:", sourceFileName);
        console.log("Source hashes:", JSON.stringify(sourceHashes));
        console.log("Python engine bestMatch:", bestMatch ? `YES (${bestMatch.matched_filename}, score=${bestMatch.similarity_score_out_of_20})` : "NO MATCH");

        // ─── Check if this exact image already exists in user's DB ───
        const existingAssetByHash = await findExistingAssetByHash(userId, sourceHashes);
        console.log("findExistingAssetByHash:", existingAssetByHash ? `FOUND (${existingAssetByHash.filename || existingAssetByHash.title})` : "NOT FOUND");

        // ─── MongoDB-level vault scan ───
        // The Python engine only checks its local JSON DB (data/assets.json).
        // Assets registered via MongoDB (from other systems/users) won't be found by Python.
        // This scan searches ALL assets in MongoDB by perceptual hash similarity.
        const mongoMatch = await findBestMatchInMongoDB(sourceHashes);
        console.log("findBestMatchInMongoDB:", mongoMatch ? `FOUND (${mongoMatch.asset.filename || mongoMatch.asset.title}, similarity=${(mongoMatch.similarity * 100).toFixed(1)}%, type=${mongoMatch.matchType})` : "NOT FOUND");
        console.log("============================================\n");

        if (!bestMatch) {
            // No match found in the Python logic engine.
            // But check: does MongoDB have a match?

            // 1. Exact hash match in user's own assets
            if (existingAssetByHash) {
                return res.status(200).json({
                    status: "duplicate",
                    ...comparisonResult,
                    matchedFilename: existingAssetByHash.filename || existingAssetByHash.title,
                    confidence: 100,
                    alertCreated: false,
                    isDuplicate: true,
                    transformedMatchDetected: false,
                    matchType: "Original",
                    message: "This exact image already exists in your asset library.",
                });
            }

            // 2. Perceptual hash similarity match across ALL MongoDB assets
            if (mongoMatch) {
                const matchedAsset = mongoMatch.asset;
                const confidence = Math.round(mongoMatch.similarity * 100);
                const matchedFilename = matchedAsset.filename || matchedAsset.title || "unknown";

                return res.status(200).json({
                    status: "match",
                    ...comparisonResult,
                    matchedFilename,
                    confidence,
                    alertCreated: false,
                    isDuplicate: true,
                    transformedMatchDetected: mongoMatch.matchType !== "Original",
                    matchType: mongoMatch.matchType,
                    isCropDetected: mongoMatch.matchType === "Cropped",
                    isContrastDetected: false,
                    transformationType: mongoMatch.matchType === "Original" ? "exact" : mongoMatch.matchType.toLowerCase(),
                    mongoMatchDetails: {
                        ahashSimilarity: mongoMatch.ahashSim,
                        phashSimilarity: mongoMatch.phashSim,
                        dhashSimilarity: mongoMatch.dhashSim,
                        colorSimilarity: mongoMatch.colorSim,
                        globalCombined: mongoMatch.globalCombined,
                        scoreOutOf20: mongoMatch.score,
                    },
                    message: `This file matches ${matchedFilename} already in your vault.`,
                });
            }

            // 3. No match anywhere — register as new asset
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
                tileHashes: sourceHashes?.tile_hashes || [],
            });

            // Register into Python detection DB so future uploads can find duplicates
            // Register synchronously so assets.json is updated BEFORE the response.
            // If we don't await, the next upload runs compare before registration finishes.
            try {
                await registerAsset(filePath, String(createdAsset._id), sourceFileName);
            } catch (regErr) {
                console.error("[registerAsset] failed:", regErr);
            }

            return res.status(200).json({
                status: "no_match",
                ...comparisonResult,
                matchedFilename: null,
                confidence: 0,
                uploadedAssetId: createdAsset?._id || null,
                alertCreated: false,
            });
        }

        // ─── We have a best match from the detection engine ───
        const matchMetrics = buildMatchMetrics(bestMatch);
        let combinedSimilarityPercentage = matchMetrics.combinedSimilarityPercentage;
        let similarityScoreOutOf20 = matchMetrics.similarityScoreOutOf20;
        const shouldCreateAlert = shouldGenerateAlertFromMetrics(matchMetrics);
        const transformedExistingMatch = isTransformedExistingMatch(matchMetrics);
        const isExistingMatch = shouldCreateAlert || transformedExistingMatch;
        const normalizedMatchStatus = String(matchMetrics.matchStatus || "no_match").toLowerCase();
        const isDuplicateUpload = ["identical", "strong", "partial"].includes(normalizedMatchStatus) || isExistingMatch;

        // Also use Python-side transformation flags
        const isCropDetected = Boolean(comparisonResult?.is_crop || matchMetrics.isCrop);
        const isContrastDetected = Boolean(comparisonResult?.is_contrast || matchMetrics.isContrast);
        const transformationType = comparisonResult?.transformation_type || matchMetrics.transformationType || "none";

        // ─── Determine matchType label: Original / Cropped / Transformed ───
        let matchType = "Transformed";
        if (transformationType === "exact" || normalizedMatchStatus === "identical") {
            matchType = "Original";
        } else if (transformationType === "near_exact" && combinedSimilarityPercentage >= 85) {
            matchType = "Original";
        } else if (isCropDetected || transformationType === "crop") {
            matchType = "Cropped";
        } else if (isContrastDetected || transformationType === "contrast") {
            matchType = "Transformed";
        }

        // If mongoMatch is stronger than the Python match, prefer it for matchedFilename
        let resolvedMatchedFilename = bestMatch?.matched_filename || null;
        if (mongoMatch && mongoMatch.similarity * 100 > combinedSimilarityPercentage) {
            const mongoAsset = mongoMatch.asset;
            resolvedMatchedFilename = mongoAsset.filename || mongoAsset.title || resolvedMatchedFilename;
            combinedSimilarityPercentage = Math.round(mongoMatch.similarity * 100);
            similarityScoreOutOf20 = mongoMatch.score;
            matchType = mongoMatch.matchType;
        }

        // ─── Prevent duplicate uploads to DB ───
        // If it's a duplicate/existing match, do NOT create a new asset in the user's library
        let createdUploadedAsset = null;
        if (!isDuplicateUpload) {
            // Check if exact hash already exists first
            if (existingAssetByHash) {
                // Don't create another — it already exists
                createdUploadedAsset = existingAssetByHash;
            } else {
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
            matchedFilename: resolvedMatchedFilename,
            combinedSimilarityPercentage,
            similarityScoreOutOf20,
            matchMetrics,
            metadata: {
                description: `Match status: ${matchMetrics.matchStatus}`,
                transformationType,
                isCrop: isCropDetected,
                isContrast: isContrastDetected,
            },
        });

        linkedAsset.detectionCount = (linkedAsset.detectionCount || 0) + 1;
        linkedAsset.lastDetectedAt = new Date();
        linkedAsset.detections = linkedAsset.detections || [];
        linkedAsset.detections.push(detection._id);

        let createdAlert = null;

        if (shouldCreateAlert) {
            const alertTitle = buildAlertTitle(matchMetrics, matchMetrics.matchStatus);
            const alertDescription = buildAlertDescription(
                sourceFileName,
                resolvedMatchedFilename,
                combinedSimilarityPercentage,
                matchMetrics
            );

            createdAlert = await Alert.create({
                assetId: linkedAsset._id,
                userId,
                detectionId: detection._id,
                title: alertTitle,
                description: alertDescription,
                platform: "other",
                urlFound: `upload://${sourceFileName}`,
                violationType: "unauthorized_use",
                severity: severityFromScore(similarityScoreOutOf20),
                status: "open",
                sourceFileName,
                sourceType,
                matchedAssetExternalId: bestMatch?.matched_asset_id,
                matchedPublicId: bestMatch?.matched_public_id,
                matchedFilename: resolvedMatchedFilename,
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
            matchedFilename: resolvedMatchedFilename,
            confidence: combinedSimilarityPercentage,
            detectionId: detection._id,
            alertId: createdAlert?._id || null,
            alertCreated: Boolean(createdAlert),
            uploadedAssetId: createdUploadedAsset?._id || null,
            isDuplicate: isDuplicateUpload,
            transformedMatchDetected: transformedExistingMatch,
            matchType,
            isCropDetected,
            isContrastDetected,
            transformationType,
        });
    } catch (error) {
        throw new ApiError(500, error?.message || "Detection failed");
    } finally {
        // File is safe to delete now - registerAsset() has already been awaited above.
        if (filePath && fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch {}
        }
    }
});
