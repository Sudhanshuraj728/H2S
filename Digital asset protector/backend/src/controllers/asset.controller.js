// ========== IMPORTS ==========
import { Asset } from "../models/asset.model.js";
// Asset model ko directly import kr rhe h jisse database operations kr ske

import { User } from "../models/user.model.js";
// User model ko directly import kr rhe h kyuki ownership check kr skte h

import { asyncHandler } from "../utils/asyncHandler.js";
// asyncHandler wrapper use kr rhe h jo promise ke errors ko automatically catch krt ah

import { ApiError } from "../utils/ApiError.js";
// Custom error class use kr rhe h uniform error responses ke liye

import { ApiResponse } from "../utils/ApiResponse.js";
// Custom response class use kr rhe h uniform success responses ke liye

// ========== CONTROLLER FUNCTIONS ==========

// ===== 1. UPLOAD NEW ASSET =====
export const uploadAsset = asyncHandler(async (req, res) => {
    // req body -> data
    // title, description, fileUrl, fileHash, fileType, fileSize
    // owner automatically req.user se aayega (from JWT middleware)
    // asset create krna aur database me save krna

    const { title, fileUrl, fileHash, fileType, fileSize, description, platforms } = req.body;
    // req.body se asset ki basic information extract kr rhe h
    // console.log(title, fileUrl, fileHash, fileType);

    if (!title || !fileUrl || !fileHash || !fileType || !fileSize) {
        throw new ApiError(400, "Title, fileUrl, fileHash, fileType, and fileSize are required");
    }
    // validation: required fields check kr rhe h kyuki inn ke bina asset complete nhi ho sakta

    const fileHashAlreadyExists = await Asset.findOne({ fileHash });
    // database me check kr rhe h ki ye fileHash pehle se exist krta h ya nahi
    // agar same file do baar upload ho gya to vo ek hi hash se identify hoga

    if (fileHashAlreadyExists) {
        throw new ApiError(409, "This asset already exists (duplicate detected by fingerprint)");
    }
    // agr hash already exist krta h to conflict error throw kr do

    const asset = await Asset.create({
        title,
        description,
        fileUrl,
        fileHash,
        fileType,
        fileSize,
        owner: req.user._id,
        // owner automatically set hota h - jo user login h uski ID set hoti h
        platforms: platforms || ["youtube", "instagram", "twitter", "facebook", "tiktok"],
        // agar custom platforms nhi diye to default platforms use ho jayenge
    });

    // Asset.create se asset create hota h aur database me save bhi hota h
    // req.user._id milta h auth.middleware se - verifyJWT middleware ne req.user set kiya h

    const createdAsset = await Asset.findById(asset._id).populate("owner", "_id firstName lastName email");
    // newly created asset ko dobara fetch kr rhe h aur owner ki details populate kr rhe h
    // populate("owner") iska matlab - owner field mein sirf ID nhi balki puri User object aayegi

    if (!createdAsset) {
        throw new ApiError(500, "Something went wrong while creating the asset");
    }
    // agr asset create nhi hua to server error throw kr do

    return res.status(201).json(
        new ApiResponse(201, createdAsset, "Asset uploaded and protected successfully")
    );
    // 201 = Created status code - naya resource ban gaya
});

// ===== 2. GET ALL ASSETS (For Current User) =====
export const getAllAssets = asyncHandler(async (req, res) => {
    // req.user se owner ID lete h
    // owner ke saare assets get krte h
    // pagination support (optional - skip, limit use kr skte h)

    const userId = req.user._id;
    // currently logged in user ki ID

    const { page = 1, limit = 10, status } = req.query;
    // query parameters: page (default 1), limit (default 10), status (filter)
    // example: /api/assets?page=2&limit=20&status=flagged

    const query = { owner: userId };
    // initially query sirf owner ke basis par h

    if (status) {
        query.status = status;
        // agr status parameter diya h to use add kr sakte h query me
        // example: status = "flagged" to sirf flagged assets dikhenge
    }

    const skip = (page - 1) * limit;
    // pagination ke liye skip calculate kr rhe h
    // page 1 pe skip = 0, page 2 pe skip = 10, page 3 pe skip = 20 (agar limit 10 h)

    const assets = await Asset.find(query)
        .populate("owner", "_id firstName lastName email")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
    // -1 matlab newest first

    // Asset.find(query) se matching assets milte hain
    // populate se owner ki details aati hain
    // skip-limit se pagination hoti h
    // sort se sabse naye assets first aate hain

    const totalAssets = await Asset.countDocuments(query);
    // total assets count jisse frontend me pagination info dikh jaye

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                assets,
                pagination: {
                    total: totalAssets,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(totalAssets / limit),
                },
            },
            "Assets retrieved successfully"
        )
    );
});

// ===== 3. GET SINGLE ASSET BY ID =====
export const getAssetById = asyncHandler(async (req, res) => {
    // req.params se asset ID lete h
    // ownership verify krte h
    // asset details return krte h

    const { assetId } = req.params;
    // URL se asset ID extract kr rhe h
    // example: /api/assets/65a1b2c3d4e5f6a7b8c9d0e1

    const asset = await Asset.findById(assetId).populate("owner", "_id firstName lastName email");
    // asset ko ID se find kr rhe h aur owner ki details populate kr rhe h

    if (!asset) {
        throw new ApiError(404, "Asset not found");
    }
    // agr asset nhi mila to 404 error throw kr do

    if (asset.owner._id.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to view this asset");
    }
    // we can comment out this kyuki mai demo data use krne vala hu jisme ownership check nhi hoga
    // ownership verify kr rhe h - sirf vo user hi asset dekh sakta h jisne banaya h
    // toString() se ID ko string me compare krte hain (kyuki ObjectId objects hain)

    return res.status(200).json(
        new ApiResponse(200, asset, "Asset retrieved successfully")
    );
});

// ===== 4. UPDATE ASSET =====
export const updateAsset = asyncHandler(async (req, res) => {
    // req.params se asset ID lete h
    // req.body se update data lete h
    // ownership verify krte h
    // asset update krte h

    const { assetId } = req.params;
    const { title, description, status, platforms, tags } = req.body;
    // jo fields update krni hain vo extract kr rhe h
    // note: fileUrl, fileHash, fileType, fileSize update nahi kar sakte - ye fixed hain

    const asset = await Asset.findById(assetId);
    // first asset find krte h

    if (!asset) {
        throw new ApiError(404, "Asset not found");
    }

    if (asset.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this asset");
    }
    // ownership verify kr rhe h

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (status) updateData.status = status;
    if (platforms) updateData.platforms = platforms;
    if (tags) updateData.tags = tags;
    // jo fields provide ki hain vo updateData mein add kr rhe h

    const updatedAsset = await Asset.findByIdAndUpdate(assetId, updateData, {
        new: true,
        runValidators: true,
    }).populate("owner", "_id firstName lastName email");

    // findByIdAndUpdate se asset update hota h
    // new: true iska matlab - updated asset return hota h (purana nahi)
    // runValidators: true iska matlab - schema validators chalte hain

    return res.status(200).json(
        new ApiResponse(200, updatedAsset, "Asset updated successfully")
    );
});

// ===== 5. DELETE ASSET =====
export const deleteAsset = asyncHandler(async (req, res) => {
    // req.params se asset ID lete h
    // ownership verify krte h
    // asset ko delete krte h

    const { assetId } = req.params;

    const asset = await Asset.findById(assetId);
    // first asset find krte h

    if (!asset) {
        throw new ApiError(404, "Asset not found");
    }

    if (asset.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this asset");
    }
    // ownership verify kr rhe h

    await Asset.findByIdAndDelete(assetId);
    // asset ko permanently delete kr rhe h
    // agar soft delete chahiye (status = deleted) to upar status update krte

    return res.status(200).json(
        new ApiResponse(200, null, "Asset deleted successfully")
    );
});

// ===== 6. GET ASSET BY FILEHAASH (For Detection System) =====
export const getAssetByFileHash = asyncHandler(async (req, res) => {
    // fileHash se asset find krte h
    // detection system use krega - jab same file detect ho to ye API call hoga

    const { fileHash } = req.params;
    // URL se fileHash extract kr rhe h

    const asset = await Asset.findOne({ fileHash }).populate("owner", "_id firstName lastName email company");
    // fileHash se asset find kr rhe h
    // findOne iska matlab - pehla match return krega

    if (!asset) {
        throw new ApiError(404, "Asset with this fingerprint not found");
    }

    return res.status(200).json(
        new ApiResponse(200, asset, "Asset found by fingerprint")
    );
});

// ===== 7. FLAG ASSET (When Violation Detected) =====
export const flagAsset = asyncHandler(async (req, res) => {
    // jab copyright violation detect ho tab asset ko flag krte h
    // status = "flagged" set kr dete h
    // detectionCount increase kr dete h

    const { assetId } = req.params;
    const { violationUrl, platform, reason } = req.body;
    // violation ka URL, platform (where found), aur reason store kr skte hain

    const asset = await Asset.findById(assetId);

    if (!asset) {
        throw new ApiError(404, "Asset not found");
    }

    // Asset ko flag kro
    asset.status = "flagged";
    asset.detectionCount = asset.detectionCount + 1;
    // har violation detect hone par count increase krta h
    asset.lastDetectedAt = new Date();
    // current time me violation record kr dete h

    await asset.save();
    // changes ko database me save krt eh hain

    return res.status(200).json(
        new ApiResponse(200, asset, "Asset flagged due to violation detection")
    );
});

// ===== 8. GET ASSET STATISTICS =====
export const getAssetStatistics = asyncHandler(async (req, res) => {
    // user ke saare assets ka analysis kr rhe h

    const userId = req.user._id;

    const totalAssets = await Asset.countDocuments({ owner: userId });
    // total assets kaunta h

    const protectedAssets = await Asset.countDocuments({
        owner: userId,
        isProtected: true,
    });
    // kitne assets protected h

    const flaggedAssets = await Asset.countDocuments({
        owner: userId,
        status: "flagged",
    });
    // kitne assets flagged h (violation h)

    const totalDetections = await Asset.aggregate([
        { $match: { owner: userId } },
        { $group: { _id: null, total: { $sum: "$detectionCount" } } },
    ]);
    // aggregate pipeline se total detections count kr rhe h

    const detectionRate =
        totalAssets > 0
            ? ((
                  (totalDetections[0]?.total || 0) / totalAssets
              ).toFixed(2))
            : 0;
    // detection rate calculate kr rhe h (kitne assets me violation detected)

    return res.status(200).json(
        new ApiResponse(200, {
            totalAssets,
            protectedAssets,
            flaggedAssets,
            totalDetections: totalDetections[0]?.total || 0,
            detectionRate: `${detectionRate}%`,
        })
    );
});
