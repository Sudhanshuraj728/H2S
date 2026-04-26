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
    Split image into grid_size x grid_size tiles and compute hashes for each.
    Returns list of dicts: [{"ahash": "...", "phash": "...", "dhash": "..."}, ...]
    """
    # Preprocess
    processed = preprocess_image(image)
    
    # Calculate tile dimensions
    width, height = processed.size
    tile_width = width // grid_size
    tile_height = height // grid_size
    
    tile_hashes = []
    
    for i in range(grid_size):
        for j in range(grid_size):
            # Extract tile
            left = j * tile_width
            top = i * tile_height
            right = left + tile_width
            bottom = top + tile_height
            
            tile = processed.crop((left, top, right, bottom))
            
            # Compute hashes for this tile
            ahash, phash, dhash, _ = compute_hashes(tile)
            tile_hashes.append({
                "ahash": ahash,
                "phash": phash,
                "dhash": dhash,
                "position": f"{i},{j}"  # Track tile position (row,col)
            })
    
    return tile_hashes