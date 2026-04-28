"""
register_asset.py
Called by the Node.js backend to register a newly protected asset into the
Python detection database (assets.json) so future uploads can be compared against it.

Usage:
    python register_asset.py <file_path> [asset_id] [original_filename]

Outputs JSON with the registered asset details.
"""
import json
import os
import sys
import uuid
import shutil
from datetime import datetime
from pathlib import Path

from PIL import Image
from hashing import compute_hashes, compute_tile_hashes
from database import AssetDB
from models import Asset


UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


def make_public_id() -> str:
    import random, string
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"ASSET-{code}"


def register(file_path: str, asset_id: str = None, original_filename: str = None) -> dict:
    file_path = Path(file_path)
    if not file_path.exists():
        return {"error": f"File not found: {file_path}"}

    ext = file_path.suffix.lower().lstrip(".")
    if ext not in ("jpg", "jpeg", "png", "webp"):
        return {"error": f"Unsupported file type: {ext}"}

    # Use provided id or generate new one
    file_id = asset_id or str(uuid.uuid4())
    filename = original_filename or file_path.name

    # Copy file into Python uploads directory for future ORB matching
    dest_path = UPLOAD_DIR / f"{file_id}_{filename}"
    if not dest_path.exists():
        shutil.copy2(str(file_path), str(dest_path))

    # Compute all hashes
    img = Image.open(file_path).convert("RGB")
    ahash, phash, dhash, colorhash = compute_hashes(img)
    tile_hashes = compute_tile_hashes(img)

    asset = Asset(
        id=file_id,
        public_id=make_public_id(),
        filename=filename,
        file_path=str(dest_path),
        upload_timestamp=datetime.now(),
        type="image",
        ahash=ahash,
        phash=phash,
        dhash=dhash,
        colorhash=colorhash,
        tile_hashes=tile_hashes,
        frame_hashes=[],
        frame_count=0,
        duration_seconds=0,
    )

    db = AssetDB()
    # Avoid re-registering the same asset (check by id)
    if not db.get_asset(file_id):
        db.add_asset(asset)

    return {
        "registered": True,
        "id": asset.id,
        "public_id": asset.public_id,
        "filename": asset.filename,
        "file_path": str(dest_path),
        "ahash": ahash,
        "phash": phash,
        "dhash": dhash,
    }


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "file_path required"}))
        return 1

    file_path = sys.argv[1]
    asset_id = sys.argv[2] if len(sys.argv) > 2 else None
    original_filename = sys.argv[3] if len(sys.argv) > 3 else None

    try:
        result = register(file_path, asset_id, original_filename)
        print(json.dumps(result, default=str))
        return 0
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
