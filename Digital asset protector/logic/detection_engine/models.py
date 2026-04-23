from datetime import datetime
from pydantic import BaseModel, Field
from typing import Literal, Optional, List, Dict



class Asset(BaseModel):
    id: str
    public_id: str  # NEW: user-friendly asset reference (ASSET-XXXXXXXX)
    filename: str
    file_path: str
    upload_timestamp: datetime
    type: Literal["image", "video"]
    ahash: str
    phash: str
    dhash: str
    colorhash: str = ""  # NEW: color distribution hash
    frame_hashes: list[dict] = Field(default_factory=list)  # FIXED: safer than = []
    tile_hashes: list[dict] = Field(default_factory=list)  # NEW: 3x3 tile hashes for crop resistance
    frame_count: int = 0
    duration_seconds: int = 0



class MatchDetail(BaseModel):
    matched_asset_id: str
    matched_public_id: str  # NEW: user-friendly reference
    source_file_name: str
    
    # Raw component similarities
    global_hash_similarity: float
    colour_similarity: float
    crop_similarity: float
    orb_similarity: float
    
    # Individual hash breakdowns
    ahash_similarity: float
    phash_similarity: float
    dhash_similarity: float
    
    # Scenario scores
    scenario_standard_match: float
    scenario_crop_match: float
    scenario_structural_match: float
    scenario_heavy_transform_match: float
    
    # Final verdicts
    combined_similarity_percentage: float
    similarity_score_out_of_20: float
    match_status: Literal["identical", "strong", "partial", "weak", "no_match"]



class Alert(BaseModel):
    alert_id: str
    matched_asset_id: str
    matched_public_id: str  # NEW: user-friendly reference
    source_file_name: str
    similarity_score_out_of_20: float
    similarity_percentage: float
    timestamp: datetime
    status: Literal["new", "reviewed", "resolved"]
    severity: Literal["low", "medium", "high", "critical"]
    first_seen: datetime
    last_seen: datetime
    match_count: int
    best_score: float



class ScanEvent(BaseModel):
    event_id: str
    source_file_name: str
    source_type: Literal["image", "video", "video_frame"]
    scanned_at: datetime
    matched: bool
    matched_asset_id: Optional[str] = None
    matched_public_id: Optional[str] = None  # NEW: user-friendly reference
    similarity_score_out_of_20: Optional[float] = None
    severity: Optional[Literal["low", "medium", "high", "critical"]] = None



class Analytics(BaseModel):
    total_assets: int
    total_scans_performed: int
    total_matches_found: int
    average_similarity_score: float
    active_alerts_count: int
    resolved_alerts_count: int
    critical_alerts_count: int
    high_alerts_count: int
    medium_alerts_count: int
    low_alerts_count: int
    top_matched_assets: list[dict]
    matches_by_severity: dict