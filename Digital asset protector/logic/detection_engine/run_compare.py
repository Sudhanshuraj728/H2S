"""
run_compare.py
Called by Node.js to compare an uploaded image against the asset database.

Node.js sends MongoDB assets as JSON via stdin.
If stdin is empty/absent, falls back to the local assets.json.

Usage:
    python run_compare.py <file_path>
    # With MongoDB assets piped via stdin:
    echo '[{"_id":"...","ahash":"...","phash":"...",...}]' | python run_compare.py <file_path>
"""
import json
import os
import sys
from PIL import Image

from hashing import compute_hashes, compute_tile_hashes
from scanner import compare_hashes_to_assets, compare_hashes_to_mongo_assets


IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}


def compare_image(file_path: str, mongo_assets=None) -> dict:
    image = Image.open(file_path).convert("RGB")
    ahash, phash, dhash, colorhash = compute_hashes(image)
    tile_hashes = compute_tile_hashes(image)

    if mongo_assets:
        # Use MongoDB assets (live data from Node.js)
        result = compare_hashes_to_mongo_assets(
            source_name=os.path.basename(file_path),
            source_type="image",
            ahash=ahash,
            phash=phash,
            dhash=dhash,
            colorhash=colorhash,
            tile_hashes=tile_hashes,
            source_path=file_path,
            mongo_assets=mongo_assets,
        )
    else:
        # Fallback: use local assets.json
        result = compare_hashes_to_assets(
            source_name=os.path.basename(file_path),
            source_type="image",
            ahash=ahash,
            phash=phash,
            dhash=dhash,
            colorhash=colorhash,
            tile_hashes=tile_hashes,
            source_path=file_path,
        )

    result["source_hashes"] = {
        "ahash": ahash,
        "phash": phash,
        "dhash": dhash,
        "colorhash": colorhash,
        "tile_hashes": tile_hashes,  # included so Node.js can store in MongoDB
    }

    # Extract transformation info from best match for the backend
    best = result.get("best_match")
    if best:
        result["transformation_type"] = best.get("transformation_type", "none")
        result["is_crop"] = best.get("is_crop", False)
        result["is_contrast"] = best.get("is_contrast", False)
    else:
        result["transformation_type"] = "none"
        result["is_crop"] = False
        result["is_contrast"] = False

    return result


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "file path is required"}))
        return 1

    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(json.dumps({"error": "file not found"}))
        return 1

    ext = os.path.splitext(file_path)[1].lower().lstrip(".")
    if ext not in IMAGE_EXTENSIONS:
        print(json.dumps({"error": f"unsupported file type: {ext}"}))
        return 1

    # Read MongoDB assets from stdin (sent by Node.js as JSON array)
    mongo_assets = None
    try:
        if not sys.stdin.isatty():
            stdin_data = sys.stdin.read().strip()
            if stdin_data:
                parsed = json.loads(stdin_data)
                # Accept both array and single object
                if isinstance(parsed, list):
                    mongo_assets = [a for a in parsed if isinstance(a, dict)]
                elif isinstance(parsed, dict):
                    mongo_assets = [parsed]
                if not mongo_assets:
                    mongo_assets = None
    except Exception:
        mongo_assets = None  # Fall back to assets.json

    try:
        result = compare_image(file_path, mongo_assets=mongo_assets)
        print(json.dumps(result, default=str))
        return 0
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
