"""Test: simulate the full run_compare flow with an image that exists in MongoDB."""
import sys
from database import AssetDB

# First, find CRIC.jpeg in the database and get its hashes
db = AssetDB()
assets = db.all_assets()

cric = None
for a in assets:
    if "CRIC" in a.filename.upper():
        cric = a
        break

if not cric:
    print("ERROR: CRIC.jpeg not found in MongoDB!")
    sys.exit(1)

print(f"Found CRIC.jpeg in MongoDB: {cric.filename}")
print(f"  ahash: {cric.ahash}")
print(f"  phash: {cric.phash}")
print(f"  dhash: {cric.dhash}")

# Now simulate what run_compare does: compare these hashes against all assets
from scanner import compare_hashes_to_assets

result = compare_hashes_to_assets(
    source_name="CRIC.jpeg",
    source_type="image",
    ahash=cric.ahash,
    phash=cric.phash,
    dhash=cric.dhash,
    colorhash=cric.colorhash,
)

best = result.get("best_match")
if best:
    print(f"\nBEST MATCH: {best['matched_filename']}")
    print(f"  Score: {best['similarity_score_out_of_20']}/20")
    print(f"  Status: {best['match_status']}")
    print(f"  Similarity: {best['combined_similarity_percentage']}%")
    print(f"  Transformation: {best.get('transformation_type', 'none')}")
else:
    print("\nNO MATCH FOUND — THIS IS A BUG!")
