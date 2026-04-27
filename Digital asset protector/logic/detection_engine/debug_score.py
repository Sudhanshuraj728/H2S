"""Debug script: shows raw scores for any image against all assets."""
import sys, json
from PIL import Image
from hashing import compute_hashes, compute_tile_hashes
from scanner import score_against_asset
from database import AssetDB

def main():
    if len(sys.argv) < 2:
        print("Usage: python debug_score.py <image_path>")
        return
    path = sys.argv[1]
    img = Image.open(path).convert("RGB")
    ahash, phash, dhash, colorhash = compute_hashes(img)
    tile_hashes = compute_tile_hashes(img)

    print(f"Query tiles: {len(tile_hashes)}")
    print(f"Query ahash={ahash} phash={phash} dhash={dhash}")

    db = AssetDB()
    assets = db.all_assets()
    print(f"Assets in DB: {len(assets)}")
    for asset in assets:
        import os
        file_exists = os.path.exists(asset.file_path) if asset.file_path else False
        print(f"\nAsset: {asset.filename} | tiles={len(asset.tile_hashes)} | file_exists={file_exists}")
        score, result = score_against_asset(asset, ahash, phash, dhash, colorhash, tile_hashes, source_path=path)
        print(f"  global_hash={result['global_hash_similarity']:.3f}  color={result['colour_similarity']:.3f}")
        print(f"  tile(crop)={result['crop_similarity']:.3f}  orb={result['orb_similarity']:.3f}")
        print(f"  scenario_crop={result['scenario_crop_match']}%  scenario_standard={result['scenario_standard_match']}%")
        print(f"  COMBINED={result['combined_similarity_percentage']}%  SCORE={score:.2f}/20  STATUS={result['match_status']}")

if __name__ == "__main__":
    main()
