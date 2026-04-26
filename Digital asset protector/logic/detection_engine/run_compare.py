import json
import os
import sys
from PIL import Image

from hashing import compute_hashes, compute_tile_hashes
from scanner import compare_hashes_to_assets


IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}


def compare_image(file_path: str) -> dict:
    image = Image.open(file_path).convert("RGB")
    ahash, phash, dhash, colorhash = compute_hashes(image)
    tile_hashes = compute_tile_hashes(image)

    return compare_hashes_to_assets(
        source_name=os.path.basename(file_path),
        source_type="image",
        ahash=ahash,
        phash=phash,
        dhash=dhash,
        colorhash=colorhash,
        tile_hashes=tile_hashes,
        source_path=file_path,
    )


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

    try:
        result = compare_image(file_path)
        print(json.dumps(result, default=str))
        return 0
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
