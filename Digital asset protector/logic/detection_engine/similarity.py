# similarity.py
import imagehash
from typing import Literal, List, Dict


_similarity_ranges = {
    (15, 20): "strong",
    (10, 14): "partial",
    (5, 9): "weak",
    (0, 4): "no_match",
}


def get_status(score: float) -> Literal["identical", "strong", "partial", "weak", "no_match"]:
    if score >= 20:
        return "identical"
    for (low, high), status in _similarity_ranges.items():
        if low <= score <= high:
            return status
    return "no_match"


def hamming_sim(hash1: str, hash2: str) -> float:
    """Calculate Hamming similarity (0-1, higher=more similar)"""
    # Handle empty or invalid hashes
    if not hash1 or not hash2:
        return 0.0
    
    try:
        h1 = imagehash.hex_to_hash(hash1)
        h2 = imagehash.hex_to_hash(hash2)
    except (ValueError, TypeError):
        # Invalid hash format
        return 0.0
    
    dist = h1 - h2
    max_dist = h1.hash.size  # Correct: total bits in hash (64 for 8x8 hash)
    sim = 1.0 - (dist / max_dist)
    return sim


def _tile_similarity(asset_tile_hashes: List[Dict], query_tile_hashes: List[Dict]) -> float:
    """
    NEW: Calculate average tile similarity across matching positions
    Compares 3x3 tiles position-by-position (row,col)
    """
    if not asset_tile_hashes or not query_tile_hashes:
        return 0.0
    
    total_sim = 0.0
    count = 0
    
    for asset_tile in asset_tile_hashes:
        for query_tile in query_tile_hashes:
            if asset_tile.get("position") == query_tile.get("position"):
                ah_sim = hamming_sim(asset_tile["ahash"], query_tile["ahash"])
                ph_sim = hamming_sim(asset_tile["phash"], query_tile["phash"])
                dh_sim = hamming_sim(asset_tile["dhash"], query_tile["dhash"])
                tile_sim = (ah_sim + ph_sim + dh_sim) / 3.0
                total_sim += tile_sim
                count += 1
                break
    
    return total_sim / max(count, 1)


def weighted_similarity(
    ahash1: str, ahash2: str, 
    phash1: str, phash2: str, 
    dhash1: str, dhash2: str,
    colorhash1: str = "", colorhash2: str = "",  # NEW
    tile_hashes1: List[Dict] = None, tile_hashes2: List[Dict] = None  # NEW
) -> dict:
    """
    UPDATED: 5-way weighted similarity scoring
    55% Global hashes (a/p/d) + 15% Color + 30% Tile matching
    """
    # 1. Global hash similarities (55% weight)
    sa = hamming_sim(ahash1, ahash2)
    sp = hamming_sim(phash1, phash2)
    sd = hamming_sim(dhash1, dhash2)
    global_combined = (sa * 0.2) + (sp * 0.5) + (sd * 0.3)  # Existing internal weights
    global_score = global_combined * 20.0  # Scale to 0-20
    
    # 2. Color similarity (15% weight)
    sc = hamming_sim(colorhash1, colorhash2) if colorhash1 and colorhash2 else 0.0
    color_score = sc * 20.0
    
    # 3. Tile similarity (30% weight)
    st = _tile_similarity(tile_hashes1 or [], tile_hashes2 or [])
    tile_score = st * 20.0
    
    # 4. FINAL WEIGHTED COMBINATION: 55% global + 15% color + 30% tile
    final_score = (global_score * 0.55) + (color_score * 0.15) + (tile_score * 0.30)
    
    return {
        "ahash_similarity": sa,
        "phash_similarity": sp,
        "dhash_similarity": sd,
        "colorhash_similarity": sc,  # NEW
        "tile_similarity": st,       # NEW
        "combined_similarity_percentage": (final_score / 20.0),
        "similarity_score_out_of_20": final_score,
        "match_status": get_status(final_score),
    }