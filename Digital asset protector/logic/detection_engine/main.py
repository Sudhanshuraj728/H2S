import os
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any


import cv2
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException, Query

from database import AssetDB, AlertDB, AnalyticsDB, ScanEventDB
from hashing import compute_hashes, compute_tile_hashes
from models import Asset, Alert, Analytics


app = FastAPI(title="Digital Asset Protection System")


ASSET_DB = AssetDB()
ALERT_DB = AlertDB()
ANALYTICS_DB = AnalyticsDB()
SCAN_EVENT_DB = ScanEventDB()


UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


SCAN_DIR = "scan_sources"
IMAGE_DIR = os.path.join(SCAN_DIR, "images")
VIDEO_DIR = os.path.join(SCAN_DIR, "videos")
for d in [SCAN_DIR, IMAGE_DIR, VIDEO_DIR]:
    os.makedirs(d, exist_ok=True)


def make_public_id() -> str:
    """NEW: Generates ASSET-XXXXXXXX user-friendly codes"""
    import random
    import string
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"ASSET-{code}"


def extract_video_frame_hashes(video_path: str):
    """UPDATED: Now includes colorhash/tile_hashes per frame"""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        cap.release()
        return [], 0

    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps <= 0:
        fps = 30

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_seconds = max(1, int(total_frames / fps))

    frame_hashes = []

    for sec in range(duration_seconds):
        cap.set(cv2.CAP_PROP_POS_MSEC, sec * 1000)
        ret, frame = cap.read()
        if not ret:
            break

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = Image.fromarray(rgb).convert("RGB")
        ahash, phash, dhash, colorhash = compute_hashes(img)
        tile_hashes = compute_tile_hashes(img)

        frame_hashes.append({
            "second": sec,
            "ahash": ahash,
            "phash": phash,
            "dhash": dhash,
            "colorhash": colorhash,  # NEW
            "tile_hashes": tile_hashes,  # NEW
        })

    cap.release()
    return frame_hashes, len(frame_hashes)


@app.get("/ping")
def ping():
    return {"message": "Digital Asset Protection System is running"}


@app.post("/upload-asset", response_model=Asset)
async def upload_asset(file: UploadFile = File(...)):
    ext = file.filename.lower().split(".")[-1]
    if ext not in ("jpg", "jpeg", "png", "webp", "mp4", "avi", "mkv", "mov"):
        raise HTTPException(400, "Unsupported file type")

    file_type = "image" if ext in ("jpg", "jpeg", "png", "webp") else "video"

    file_id = str(uuid.uuid4())
    public_id = make_public_id()  # NEW: Generate user-friendly ID
    stem = file.filename.rsplit(".", 1)[0]
    save_path = UPLOAD_DIR / f"{file_id}_{stem}.{ext}"

    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    if file_type == "image":
        img = Image.open(save_path).convert("RGB")
        ahash, phash, dhash, colorhash = compute_hashes(img)  # UPDATED: 4 hashes
        tile_hashes = compute_tile_hashes(img)  # NEW
        frame_hashes = []
        frame_count = 0
        duration_seconds = 0
    else:
        frame_hashes, duration_seconds = extract_video_frame_hashes(save_path)

        if frame_hashes:
            mid = frame_hashes[len(frame_hashes) // 2]
            ahash = mid["ahash"]
            phash = mid["phash"]
            dhash = mid["dhash"]
            colorhash = mid.get("colorhash", "")  # NEW
            tile_hashes = mid.get("tile_hashes", [])  # NEW
        else:
            img = Image.new("RGB", (10, 10), color=(73, 109, 137))
            ahash, phash, dhash, colorhash = compute_hashes(img)
            tile_hashes = compute_tile_hashes(img)
        
        frame_count = len(frame_hashes)

    asset = Asset(
        id=file_id,
        public_id=public_id,  # NEW
        filename=file.filename,
        file_path=str(save_path),
        upload_timestamp=datetime.now(),
        type=file_type,
        ahash=ahash,
        phash=phash,
        dhash=dhash,
        colorhash=colorhash,  # NEW
        tile_hashes=tile_hashes,  # NEW
        frame_hashes=frame_hashes,
        frame_count=frame_count,
        duration_seconds=duration_seconds,
    )
    ASSET_DB.add_asset(asset)
    ANALYTICS_DB.set_total_assets(len(ASSET_DB.all_assets()))
    return asset


# NEW: Search endpoint
@app.get("/assets/search")
def search_assets(query: str = Query(..., description="Search by filename or public_id")):
    """NEW: Search assets by filename or public_id"""
    results = []
    query_lower = query.lower()
    
    for asset in ASSET_DB.all_assets():
        if (query_lower in asset.filename.lower() or 
            query_lower in asset.public_id.lower()):
            results.append({
                "id": asset.id,
                "public_id": asset.public_id,
                "filename": asset.filename,
                "type": asset.type,
                "upload_timestamp": asset.upload_timestamp.isoformat()
            })
    
    return {
        "query": query,
        "total_results": len(results),
        "assets": results
    }


# NEW: Get asset by public_id endpoint
@app.get("/assets/by-public-id/{public_id}", response_model=Asset)
def get_asset_by_public_id(public_id: str):
    """NEW: Get asset by user-friendly public_id"""
    asset = ASSET_DB.get_asset_by_public_id(public_id)
    if not asset:
        raise HTTPException(404, f"Asset ASSET-{public_id} not found")
    return asset


@app.get("/assets", response_model=List[Asset])
def get_assets():
    return ASSET_DB.all_assets()


@app.post("/compare-asset/{asset_ref}", response_model=dict)
def compare_asset(asset_ref: str, file: UploadFile = File(...)):
    """UPDATED: Now accepts UUID OR public_id"""
    from scanner import score_against_asset  # Lazy import avoids circular dependency

    # Try UUID first, then public_id
    target = ASSET_DB.get_asset(asset_ref) or ASSET_DB.get_asset_by_public_id(asset_ref)
    if target is None:
        raise HTTPException(404, "Asset not found")

    ext = file.filename.lower().split(".")[-1]
    if ext not in ("jpg", "jpeg", "png", "webp", "mp4", "avi", "mkv", "mov"):
        raise HTTPException(400, "Unsupported file type")

    file_type = "image" if ext in ("jpg", "jpeg", "png", "webp") else "video"

    compare_path = UPLOAD_DIR / f"compare_{uuid.uuid4()}.{ext}"
    with open(compare_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    if file_type == "image":
        img = Image.open(compare_path).convert("RGB")
        ahash, phash, dhash, colorhash = compute_hashes(img)
        tile_hashes = compute_tile_hashes(img)
        score, result = score_against_asset(
            target, ahash, phash, dhash, colorhash, tile_hashes,
            source_path=str(compare_path)  # Pass path for ORB matching
        )
        result["matched_asset_id"] = target.id
        result["matched_public_id"] = target.public_id
        result["matched_filename"] = target.filename
        return result

    frame_hashes, _ = extract_video_frame_hashes(compare_path)
    if not frame_hashes:
        raise HTTPException(400, "Could not extract frames from video")

    # Compare each frame against target asset
    best_score = -1.0
    best_result = None
    for frame in frame_hashes:
        score, result = score_against_asset(
            target,
            frame["ahash"], frame["phash"], frame["dhash"],
            frame.get("colorhash", ""), frame.get("tile_hashes", [])
        )
        if score > best_score:
            best_score = score
            best_result = result

    if best_result:
        best_result["matched_asset_id"] = target.id
        best_result["matched_public_id"] = target.public_id
        best_result["matched_filename"] = target.filename
        best_result["best_similarity_score_out_of_20"] = best_score
        return best_result

    return {"error": "No valid comparison possible"}


@app.post("/compare-against-all", response_model=dict)
def compare_against_all(file: UploadFile = File(...)):
    """UPDATED: Uses new scanner logic with colorhash/tile_hashes + ORB"""
    from scanner import compare_hashes_to_assets  # Lazy import avoids circular dependency

    ext = file.filename.lower().split(".")[-1]
    if ext not in ("jpg", "jpeg", "png", "webp", "mp4", "avi", "mkv", "mov"):
        raise HTTPException(400, "Unsupported file type")

    file_type = "image" if ext in ("jpg", "jpeg", "png", "webp") else "video"

    compare_path = UPLOAD_DIR / f"compare_all_{uuid.uuid4()}.{ext}"
    with open(compare_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    if file_type == "image":
        img = Image.open(compare_path).convert("RGB")
        ahash, phash, dhash, colorhash = compute_hashes(img)
        tile_hashes = compute_tile_hashes(img)
        return compare_hashes_to_assets(
            file.filename, "image", ahash, phash, dhash, colorhash, tile_hashes,
            source_path=str(compare_path)  # Pass path for ORB matching
        )
    else:
        frame_hashes, _ = extract_video_frame_hashes(compare_path)
        if not frame_hashes:
            raise HTTPException(400, "Could not extract frames from video")

        # Use middle frame for comparison
        mid_frame = frame_hashes[len(frame_hashes) // 2]
        return compare_hashes_to_assets(
            file.filename, "video",
            mid_frame["ahash"], mid_frame["phash"], mid_frame["dhash"],
            mid_frame.get("colorhash", ""), mid_frame.get("tile_hashes", [])
        )


@app.post("/orb-test/{asset_ref}")
async def orb_test(asset_ref: str, file: UploadFile = File(...)):
    """🔬 ORB TESTING: Directly test ORB feature-match score between an uploaded image and a registered asset.
    Returns raw ORB similarity, keypoints count, good matches, and a combined breakdown.
    Only works with image assets (ORB is not applicable to video hashes).
    """
    from scanner import _orb_similarity  # Lazy import avoids circular dependency

    # Resolve asset by UUID or public_id
    target = ASSET_DB.get_asset(asset_ref) or ASSET_DB.get_asset_by_public_id(asset_ref)
    if not target:
        raise HTTPException(404, f"Asset '{asset_ref}' not found")

    ext = file.filename.lower().split(".")[-1]
    if ext not in ("jpg", "jpeg", "png", "webp"):
        raise HTTPException(400, "ORB testing only supports image files (jpg, png, webp)")

    if not target.file_path or not os.path.exists(target.file_path):
        raise HTTPException(400, f"Asset file not found on disk: {target.file_path}")

    # Save the uploaded comparison image
    compare_path = UPLOAD_DIR / f"orb_test_{uuid.uuid4()}.{ext}"
    with open(compare_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        import cv2
        # Run ORB matching
        orb_sim = _orb_similarity(target.file_path, str(compare_path))

        # Also compute standard hashes for full comparison context
        img = Image.open(compare_path).convert("RGB")
        ahash, phash, dhash, colorhash = compute_hashes(img)
        tile_hashes = compute_tile_hashes(img)

        from scanner import score_against_asset
        combined_score, full_result = score_against_asset(
            target, ahash, phash, dhash, colorhash, tile_hashes,
            source_path=str(compare_path)
        )

        # Detailed ORB keypoint info
        img1 = cv2.imread(target.file_path, cv2.IMREAD_GRAYSCALE)
        img2 = cv2.imread(str(compare_path), cv2.IMREAD_GRAYSCALE)
        from config import ORB_FEATURES
        orb = cv2.ORB_create(ORB_FEATURES)
        kp1, des1 = orb.detectAndCompute(img1, None)
        kp2, des2 = orb.detectAndCompute(img2, None)
        total_matches = 0
        good_matches = 0
        if des1 is not None and des2 is not None:
            bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
            matches = bf.match(des1, des2)
            total_matches = len(matches)
            good_matches = len([m for m in matches if m.distance < 50])

        return {
            "asset_id": target.id,
            "asset_public_id": target.public_id,
            "asset_filename": target.filename,
            "compared_file": file.filename,
            "orb_result": {
                "orb_similarity": round(orb_sim, 4),
                "orb_similarity_percent": round(orb_sim * 100, 2),
                "asset_keypoints": len(kp1) if kp1 else 0,
                "query_keypoints": len(kp2) if kp2 else 0,
                "total_matches": total_matches,
                "good_matches": good_matches,
                "orb_features_used": ORB_FEATURES,
            },
            "full_score_breakdown": {
                "combined_score_out_of_20": round(combined_score, 2),
                "combined_similarity_percent": round((combined_score / 20) * 100, 2),
                "ahash_similarity": round(full_result.get("ahash_similarity", 0), 4),
                "phash_similarity": round(full_result.get("phash_similarity", 0), 4),
                "dhash_similarity": round(full_result.get("dhash_similarity", 0), 4),
                "colour_similarity": round(full_result.get("colour_similarity", 0), 4),
                "crop_similarity": round(full_result.get("crop_similarity", 0), 4),
                "orb_similarity": round(orb_sim, 4),
                "scenario_standard_match": full_result.get("scenario_standard_match", 0),
                "scenario_crop_match": full_result.get("scenario_crop_match", 0),
                "scenario_structural_match": full_result.get("scenario_structural_match", 0),
                "scenario_heavy_transform_match": full_result.get("scenario_heavy_transform_match", 0),
                "match_status": full_result.get("match_status", "unknown"),
            }
        }
    finally:
        # Clean up temp comparison file
        if os.path.exists(compare_path):
            os.remove(compare_path)


@app.post("/scan-now")
def trigger_scan():
    """Trigger full directory scan"""
    from scanner import run_scan
    alerts = run_scan()
    return {
        "message": "Scan completed",
        "alerts_generated": len(alerts),
        "alerts": [a.model_dump() for a in alerts],
    }


@app.get("/alerts", response_model=List[Alert])
def get_alerts():
    return ALERT_DB.all_alerts()


@app.post("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: str):
    success = ALERT_DB.update_status(alert_id, "resolved")
    if not success:
        raise HTTPException(404, "Alert not found")
    return {"message": "Alert resolved"}


@app.get("/analytics", response_model=Analytics)
def get_analytics():
    alerts = ALERT_DB.all_alerts()
    events = SCAN_EVENT_DB.all_events()

    total_matches = len([e for e in events if e.matched and e.similarity_score_out_of_20 is not None])
    scores = [a.best_score for a in alerts if a.best_score is not None]
    avg_score = sum(scores) / len(scores) if scores else 0.0

    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for a in alerts:
        severity_counts[a.severity] += 1

    top_assets = {}
    for a in alerts:
        top_assets[a.matched_asset_id] = top_assets.get(a.matched_asset_id, 0) + a.match_count

    top_matched_assets = [
        {"asset_id": k, "match_count": v}
        for k, v in sorted(top_assets.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    return Analytics(
        total_assets=len(ASSET_DB.all_assets()),
        total_scans_performed=len(events),
        total_matches_found=total_matches,
        average_similarity_score=round(avg_score, 2),
        active_alerts_count=ALERT_DB.active_count(),
        resolved_alerts_count=len([a for a in alerts if a.status == "resolved"]),
        critical_alerts_count=severity_counts["critical"],
        high_alerts_count=severity_counts["high"],
        medium_alerts_count=severity_counts["medium"],
        low_alerts_count=severity_counts["low"],
        top_matched_assets=top_matched_assets,
        matches_by_severity=severity_counts,
    )


@app.delete("/assets/clear")
def clear_assets():
    """🚨 TESTING: Clear ALL assets from database and remove uploaded files"""
    # Clean up uploaded files
    for asset in ASSET_DB.all_assets():
        if asset.file_path and os.path.exists(asset.file_path):
            os.remove(asset.file_path)
    success = ASSET_DB.clear_all_assets()
    ANALYTICS_DB.set_total_assets(0)
    if success:
        return {"message": "✅ All assets cleared!", "total_assets": 0}
    raise HTTPException(500, "Clear failed")


@app.delete("/assets/{asset_ref}")
def delete_asset(asset_ref: str):
    """Delete a single asset by UUID or public_id"""
    # Get asset details before deleting (for file cleanup)
    asset = ASSET_DB.get_asset(asset_ref) or ASSET_DB.get_asset_by_public_id(asset_ref)
    if not asset:
        raise HTTPException(404, f"Asset '{asset_ref}' not found")

    # Delete file from disk if it exists
    if asset.file_path and os.path.exists(asset.file_path):
        os.remove(asset.file_path)

    # Remove from database
    success = ASSET_DB.delete_asset(asset_ref)
    if not success:
        raise HTTPException(500, "Failed to delete asset from database")

    ANALYTICS_DB.set_total_assets(len(ASSET_DB.all_assets()))
    return {
        "message": f"✅ Asset '{asset.public_id}' ({asset.filename}) deleted successfully",
        "deleted_asset_id": asset.id,
        "deleted_public_id": asset.public_id,
    }

@app.delete("/alerts/clear") 
def clear_alerts():
    """🚨 TESTING: Clear ALL alerts"""
    success = ALERT_DB.clear_all_alerts()
    if success:
        return {"message": "✅ All alerts cleared!", "total_alerts": 0}
    raise HTTPException(500, "Clear failed")

@app.delete("/reset-all")
def reset_all_data():
    """🚨 TESTING: Nuclear reset - clears EVERYTHING"""
    ASSET_DB.clear_all_assets()
    ALERT_DB.clear_all_alerts()
    ANALYTICS_DB.set_total_assets(0)
    return {"message": "💥 COMPLETE RESET - Fresh database!"}