"""
Simple config - NO external dependencies needed.
Replace all pydantic_settings with direct imports.
"""

# Hash settings
HASH_SIZE = 16
TILE_GRID_SIZE = 3

# 5-Way Similarity Weights (55% + 15% + 30% = 100%)
GLOBAL_WEIGHT = 0.55
COLOR_WEIGHT = 0.15  
TILE_WEIGHT = 0.30

# Global hash weights (aHash/pHash/dHash within GLOBAL_WEIGHT)
AHASH_WEIGHT = 0.20
PHASH_WEIGHT = 0.50
DHASH_WEIGHT = 0.30

# Thresholds (out of 20)
MAX_SCORE = 20
THRESHOLD_IDENTICAL = 18.0
THRESHOLD_STRONG = 15.0
THRESHOLD_PARTIAL = 12.0
THRESHOLD_WEAK = 5.0

# Minimum component similarities
MIN_GLOBAL_SIM = 0.3
MIN_COLOR_SIM = 0.1
MIN_TILE_SIM = 0.2

# Video processing
DEFAULT_FRAME_INTERVAL = 1.0
MAX_FRAMES = 100

# Public ID
PUBLIC_ID_LENGTH = 8

# API
MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100MB

# ADD to config.py:
ORB_FEATURES = 1000
ORB_MATCH_THRESHOLD = 0.75