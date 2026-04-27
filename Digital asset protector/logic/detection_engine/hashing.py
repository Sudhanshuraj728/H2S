# hashing.py
from PIL import Image, ImageEnhance
import imagehash
from typing import Tuple, List, Dict


def preprocess_image(image: Image.Image) -> Image.Image:
    """
    Basic preprocessing: normalize contrast for better hash stability.
    """
    # Enhance contrast slightly
    enhancer = ImageEnhance.Contrast(image)
    return enhancer.enhance(1.2)


def compute_hashes(image: Image.Image) -> Tuple[str, str, str, str]:
    """
    Compute aHash, pHash, dHash, and colorhash for a PIL image.
    Returns (ahash, phash, dhash, colorhash) as hex strings.
    """
    # Preprocess for better stability
    processed = preprocess_image(image)
    
    a = imagehash.average_hash(processed)
    p = imagehash.phash(processed)
    d = imagehash.dhash(processed)
    c = imagehash.colorhash(processed)

    return str(a), str(p), str(d), str(c)


def compute_tile_hashes(image: Image.Image, grid_size: int = 3) -> List[Dict[str, str]]:
    """
    Split image into tiles at multiple scales and compute hashes for each.
    Returns list of dicts: [{"ahash": "...", "phash": "...", "dhash": "...", "position": "..."}, ...]
    
    Uses both 3x3 AND 5x5 grids so that crops which miss 3x3 tile boundaries
    are still caught by the finer 5x5 grid. The position label includes the grid size
    so position-independent matching in scanner.py compares like-for-like.
    """
    all_tiles = []

    for gs in (grid_size, 5):  # 3x3 and 5x5
        processed = preprocess_image(image)
        width, height = processed.size
        tile_width = width // gs
        tile_height = height // gs

        if tile_width < 4 or tile_height < 4:
            continue  # Skip if image is too small for this grid

        for i in range(gs):
            for j in range(gs):
                left = j * tile_width
                top = i * tile_height
                right = left + tile_width
                bottom = top + tile_height

                tile = processed.crop((left, top, right, bottom))

                ahash, phash, dhash, _ = compute_hashes(tile)
                all_tiles.append({
                    "ahash": ahash,
                    "phash": phash,
                    "dhash": dhash,
                    "position": f"g{gs}_{i},{j}",  # e.g. "g3_0,1" or "g5_2,3"
                })

    return all_tiles