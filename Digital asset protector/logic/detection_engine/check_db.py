import os
from database import AssetDB

db = AssetDB()
assets = db.all_assets()
print(f"Total assets in Python DB: {len(assets)}")
for a in assets:
    exists = os.path.exists(a.file_path) if a.file_path else False
    print(f"  id={a.id[:20]}... | file={a.filename} | tiles={len(a.tile_hashes)} | file_on_disk={exists}")
