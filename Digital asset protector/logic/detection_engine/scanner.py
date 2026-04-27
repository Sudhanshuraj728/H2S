import os
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional


from database import AssetDB, AlertDB, AnalyticsDB, ScanEventDB
from hashing import compute_hashes, compute_tile_hashes
from models import Alert, ScanEvent, MatchDetail


from config import ORB_FEATURES, ORB_MATCH_THRESHOLD

import cv2
import numpy as np
from PIL import Image




def _get_dbs():
    """Get the shared DB instances from main.py to avoid stale data"""
    from main import ASSET_DB, ALERT_DB, ANALYTICS_DB, SCAN_EVENT_DB
    return ASSET_DB, ALERT_DB, ANALYTICS_DB, SCAN_EVENT_DB


SCAN_DIR = "scan_sources"
IMAGE_DIR = os.path.join(SCAN_DIR, "images")
VIDEO_DIR = os.path.join(SCAN_DIR, "videos")


IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp")
VIDEO_EXTENSIONS = (".mp4", ".avi", ".mkv", ".mov")

def _orb_similarity(asset_path: str, source_path: str) -> float:
    """ORB feature matching for geometric robustness (0-1)"""
    try:
        img1 = cv2.imread(asset_path, cv2.IMREAD_GRAYSCALE)
        img2 = cv2.imread(source_path, cv2.IMREAD_GRAYSCALE)
        if img1 is None or img2 is None:
            return 0.0
        
        orb = cv2.ORB_create(ORB_FEATURES)
        kp1, des1 = orb.detectAndCompute(img1, None)
        kp2, des2 = orb.detectAndCompute(img2, None)
        
        if des1 is None or des2 is None:
            return 0.0
        
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(des1, des2)
        matches = sorted(matches, key=lambda x: x.distance)
        
        # Threshold 50: ~19% bit difference max. Keeps precision high — avoids
        # accidental matches between unrelated images that inflate the ratio.
        good_matches = [m for m in matches if m.distance < 50]
        return len(good_matches) / max(len(matches), 1)
    except:
        return 0.0


def _hamming_ratio(hash1: str, hash2: str) -> float:
    """NEW: Helper - Hamming distance ratio (0-1, higher=more similar)"""
    if len(hash1) != len(hash2):
        return 0.0
    diff = sum(c1 != c2 for c1, c2 in zip(hash1, hash2))
    return 1.0 - (diff / len(hash1))


def _tile_similarity(asset_tile_hashes: List[Dict], query_tile_hashes: List[Dict]) -> float:
    """
    UPDATED: Position-INDEPENDENT tile matching for crop resistance.
    Each query tile finds its BEST matching asset tile regardless of position.

    OLD approach (position-based): query tile (0,0) only matched asset tile (0,0).
    Problem: a cropped image's content lands at DIFFERENT grid positions, so score was always ~0.

    NEW approach (best-match): each query tile scans ALL asset tiles and takes
    the highest similarity. A crop's content will find its counterpart asset tile
    even if it's no longer at the same grid position.
    """
    from similarity import hamming_sim
    
    if not asset_tile_hashes or not query_tile_hashes:
        return 0.0

    total_best = 0.0

    for query_tile in query_tile_hashes:
        best_tile_sim = 0.0
        for asset_tile in asset_tile_hashes:
            ah_sim = hamming_sim(asset_tile["ahash"], query_tile["ahash"])
            ph_sim = hamming_sim(asset_tile["phash"], query_tile["phash"])
            dh_sim = hamming_sim(asset_tile["dhash"], query_tile["dhash"])
            sim = (ah_sim + ph_sim + dh_sim) / 3.0
            if sim > best_tile_sim:
                best_tile_sim = sim
        total_best += best_tile_sim

    return total_best / len(query_tile_hashes)


def score_against_asset(
    asset,
    ahash, phash, dhash,
    colorhash: str = "",
    tile_hashes: List[Dict] = None,
    source_path: str = None  # Optional path for ORB matching
) -> tuple[float, Dict[str, Any]]:
    """
    FIXED: 45% global hashes + 10% color + 25% tile + 20% ORB feature matching.
    Computes hash scores DIRECTLY to avoid double-weighting from weighted_similarity().
    Returns (score_out_of_20, detailed_result)
    """
    from similarity import hamming_sim, get_status

    # --- Global hash similarity (0-1) ---
    sa = hamming_sim(asset.ahash, ahash)
    sp = hamming_sim(asset.phash, phash)
    sd = hamming_sim(asset.dhash, dhash)
    global_combined = (sa * 0.20) + (sp * 0.50) + (sd * 0.30)

    # --- Color similarity (0-1) ---
    color_sim = _hamming_ratio(asset.colorhash, colorhash) if asset.colorhash and colorhash else 0.0

    # --- Crop / Tile similarity (0-1) ---
    tile_sim = _tile_similarity(asset.tile_hashes, tile_hashes or []) if tile_hashes else 0.0

    # --- ORB feature matching (0-1) ---
    orb_sim = 0.0
    if source_path and asset.file_path and os.path.exists(asset.file_path) and os.path.exists(source_path):
        orb_sim = _orb_similarity(asset.file_path, source_path)

    # ==========================================
    # SCENARIO-BASED SCORING
    # Instead of one fixed formula, we evaluate different "profiles" of matches.
    # The final score is the best fitting profile.
    # ==========================================

    # 1. Standard Match: Good for identical images or minor compression
    standard_sim = (global_combined * 0.45) + (color_sim * 0.10) + (tile_sim * 0.25) + (orb_sim * 0.20)

    # 2. Crop Match: Ignores global hashes and color, relies entirely on local structure
    crop_sim = (tile_sim * 0.40) + (orb_sim * 0.60)

    # 3. Structural Match: Ignores color completely, useful for grayscale/color-altered images
    structural_sim = (global_combined * 0.45) + (tile_sim * 0.30) + (orb_sim * 0.25)

    # 4. Heavy Transform Match: When an image is BOTH cropped and color-altered,
    # global, color, and tile hashes all fail. ORB is the only robust signal left.
    heavy_transform_sim = orb_sim

    # The overall similarity is the maximum of the scenarios
    best_overall_sim = max(standard_sim, crop_sim, structural_sim, heavy_transform_sim)
    best_score = best_overall_sim * 20.0
    best_sa, best_sp, best_sd = sa, sp, sd

    # --- Video frame fallback: pick the best-matching frame ---
    if asset.type == "video" and getattr(asset, "frame_hashes", None):
        for frame in asset.frame_hashes:
            fa = hamming_sim(frame["ahash"], ahash)
            fp = hamming_sim(frame["phash"], phash)
            fd = hamming_sim(frame["dhash"], dhash)
            fc = (fa * 0.20) + (fp * 0.50) + (fd * 0.30)
            frame_score = fc * 20.0
            if frame_score > best_score:
                best_score = frame_score
                best_overall_sim = fc
                best_sa, best_sp, best_sd = fa, fp, fd

    detailed_result = {
        # Raw component similarities
        "global_hash_similarity": round(global_combined, 4),
        "colour_similarity": round(color_sim, 4),
        "crop_similarity": round(tile_sim, 4),
        "orb_similarity": round(orb_sim, 4),
        
        # Individual hash breakdowns
        "ahash_similarity": round(best_sa, 4),
        "phash_similarity": round(best_sp, 4),
        "dhash_similarity": round(best_sd, 4),
        
        # Scenario scores
        "scenario_standard_match": round(standard_sim * 100, 2),
        "scenario_crop_match": round(crop_sim * 100, 2),
        "scenario_structural_match": round(structural_sim * 100, 2),
        "scenario_heavy_transform_match": round(heavy_transform_sim * 100, 2),

        # Final verdicts
        "combined_similarity_percentage": round(best_overall_sim * 100.0, 2),
        "similarity_score_out_of_20": round(best_score, 2),
        "match_status": get_status(best_score),
    }

    return best_score, detailed_result


def severity_from_score(score: float) -> str:
    if score >= 18:
        return "critical"
    if score >= 15:
        return "high"
    if score >= 12:
        return "medium"
    return "low"


def compare_hashes_to_assets(
    source_name: str, 
    source_type: str, 
    ahash: str, phash: str, dhash: str,
    colorhash: str = "",
    tile_hashes: Optional[List[Dict]] = None,
    source_path: str = None  # NEW: Optional source image path for ORB
) -> Dict[str, Any]:
    """UPDATED: Now accepts colorhash, tile_hashes, and source_path for ORB"""
    ASSET_DB, _, _, _ = _get_dbs()
    matches = []
    best_match = None


    for asset in ASSET_DB.all_assets():
        score, result = score_against_asset(
            asset, ahash, phash, dhash, colorhash, tile_hashes,
            source_path=source_path  # Pass source path for ORB
        )


        item = {
            "matched_asset_id": asset.id,
            "matched_public_id": asset.public_id,
            "matched_filename": asset.filename,
            "source_file_name": source_name,
            "source_type": source_type,
            **result,
            "similarity_score_out_of_20": score,
        }


        matches.append(item)


        if best_match is None or score > best_match["similarity_score_out_of_20"]:
            best_match = item


    matches.sort(key=lambda x: x["similarity_score_out_of_20"], reverse=True)


    return {
        "source_file_name": source_name,
        "source_type": source_type,
        "best_match": best_match,
        "matches": matches,
    }


def record_match_event(
    source_name: str, 
    source_type: str, 
    matched_asset_id: str,
    matched_public_id: str,
    score: float, 
    similarity_percentage: float
):
    """UPDATED: Now records matched_public_id"""
    _, ALERT_DB, _, SCAN_EVENT_DB = _get_dbs()
    severity = severity_from_score(score)


    alert = ALERT_DB.upsert_alert(
        matched_asset_id=matched_asset_id,
        matched_public_id=matched_public_id,
        source_file_name=source_name,
        score=score,
        similarity_percentage=similarity_percentage,
        severity=severity,
    )


    event = ScanEvent(
        event_id=str(uuid.uuid4()),
        source_file_name=source_name,
        source_type=source_type,  # type: ignore
        scanned_at=datetime.now(),
        matched=True,
        matched_asset_id=matched_asset_id,
        matched_public_id=matched_public_id,
        similarity_score_out_of_20=score,
        severity=severity,  # type: ignore
    )
    SCAN_EVENT_DB.add_event(event)


    return alert


def record_no_match_event(source_name: str, source_type: str):
    _, _, _, SCAN_EVENT_DB = _get_dbs()
    event = ScanEvent(
        event_id=str(uuid.uuid4()),
        source_file_name=source_name,
        source_type=source_type,  # type: ignore
        scanned_at=datetime.now(),
        matched=False,
    )
    SCAN_EVENT_DB.add_event(event)


def scan_single_image(image_path: str) -> List[Alert]:
    """UPDATED: Now computes colorhash/tile_hashes and passes source_path for ORB"""
    alerts: List[Alert] = []
    try:
        img = Image.open(image_path).convert("RGB")
        ahash, phash, dhash, colorhash = compute_hashes(img)
        tile_hashes = compute_tile_hashes(img)


        comparison = compare_hashes_to_assets(
            source_name=os.path.basename(image_path),
            source_type="image",
            ahash=ahash,
            phash=phash,
            dhash=dhash,
            colorhash=colorhash,
            tile_hashes=tile_hashes,
            source_path=image_path,  # NEW: Pass path for ORB matching
        )


        matched_any = False
        for match in comparison["matches"]:
            score = match["similarity_score_out_of_20"]
            if score >= 12:
                matched_any = True
                alert = record_match_event(
                    source_name=os.path.basename(image_path),
                    source_type="image",
                    matched_asset_id=match["matched_asset_id"],
                    matched_public_id=match["matched_public_id"],  # NEW
                    score=score,
                    similarity_percentage=match["combined_similarity_percentage"],
                )
                alerts.append(alert)


        if not matched_any:
            record_no_match_event(os.path.basename(image_path), "image")


    except Exception as e:
        record_no_match_event(os.path.basename(image_path), "image")
        print(f"Error scanning image {image_path}: {e}")


    return alerts


def extract_video_frames(video_path: str):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        cap.release()
        return


    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    if fps <= 0:
        fps = 30


    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_seconds = max(1, int(frame_count / fps))


    for sec in range(duration_seconds):
        cap.set(cv2.CAP_PROP_POS_MSEC, sec * 1000)
        ret, frame = cap.read()
        if not ret:
            continue
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        yield sec, Image.fromarray(rgb).convert("RGB")


    cap.release()


def scan_single_video(video_path: str) -> List[Alert]:
    """UPDATED: Now computes and passes colorhash/tile_hashes per frame"""
    alerts: List[Alert] = []
    base_name = os.path.basename(video_path)


    try:
        found_any_frame = False


        for frame_idx, frame_img in extract_video_frames(video_path):
            found_any_frame = True
            frame_name = f"{base_name}_frame_{frame_idx}"
            ahash, phash, dhash, colorhash = compute_hashes(frame_img)  # UPDATED: 4 hashes
            tile_hashes = compute_tile_hashes(frame_img)  # NEW


            comparison = compare_hashes_to_assets(
                source_name=frame_name,
                source_type="video_frame",
                ahash=ahash,
                phash=phash,
                dhash=dhash,
                colorhash=colorhash,  # NEW
                tile_hashes=tile_hashes,  # NEW
            )


            matched_this_frame = False
            for match in comparison["matches"]:
                score = match["similarity_score_out_of_20"]
                if score >= 12:
                    matched_this_frame = True
                    alert = record_match_event(
                        source_name=frame_name,
                        source_type="video_frame",
                        matched_asset_id=match["matched_asset_id"],
                        matched_public_id=match["matched_public_id"],  # NEW
                        score=score,
                        similarity_percentage=match["combined_similarity_percentage"],
                    )
                    alerts.append(alert)


            if not matched_this_frame:
                record_no_match_event(frame_name, "video_frame")


        if not found_any_frame:
            record_no_match_event(base_name, "video")


    except Exception as e:
        record_no_match_event(base_name, "video")
        print(f"Error scanning video {video_path}: {e}")


    return alerts


def run_scan():
    _, _, ANALYTICS_DB, _ = _get_dbs()
    ANALYTICS_DB.increment_scans()


    alerts: List[Alert] = []


    if os.path.exists(IMAGE_DIR):
        for fname in os.listdir(IMAGE_DIR):
            if fname.lower().endswith(IMAGE_EXTENSIONS):
                path = os.path.join(IMAGE_DIR, fname)
                alerts.extend(scan_single_image(path))


    if os.path.exists(VIDEO_DIR):
        for fname in os.listdir(VIDEO_DIR):
            if fname.lower().endswith(VIDEO_EXTENSIONS):
                path = os.path.join(VIDEO_DIR, fname)
                alerts.extend(scan_single_video(path))


    return alerts