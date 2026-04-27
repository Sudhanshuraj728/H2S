"""
database.py — INTEGRATED WITH MONGODB

The AssetDB class now reads directly from MongoDB (the SAME database
the Node.js backend uses). This eliminates the old data/assets.json
file and ensures the Python detection engine always checks against
the real asset vault.

Other DB classes (AlertDB, AnalyticsDB, ScanEventDB) remain local-JSON
since they are only used by the Python engine's own endpoints.
"""
import json
import os
from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4

from pymongo import MongoClient

from models import Asset, Alert, Analytics as AnalyticsModel, ScanEvent


# ─── MongoDB Connection ─────────────────────────────────────────────
# Read from the same .env the backend uses, OR from environment variable.
# Fallback: try to read the backend's .env file directly.

def _get_mongodb_uri() -> str:
    """Get MongoDB URI from environment or from the backend's .env file."""
    # 1. Check environment variable first
    uri = os.environ.get("MONGODB_URI")
    if uri:
        return uri

    # 2. Try to read from backend's .env file
    backend_env = os.path.join(
        os.path.dirname(__file__), "..", "..", "backend", ".env"
    )
    backend_env = os.path.normpath(backend_env)

    if os.path.exists(backend_env):
        with open(backend_env, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("MONGODB_URI="):
                    return line.split("=", 1)[1].strip()

    # 3. Fallback to localhost
    return "mongodb://localhost:27017/optiprimes"


_MONGO_URI = _get_mongodb_uri()
_client = MongoClient(_MONGO_URI, serverSelectionTimeoutMS=5000)
_db = _client.get_default_database() if "?" in _MONGO_URI or "/" in _MONGO_URI.split("://")[1] else _client["optiprimes"]

# Fix: extract DB name properly
try:
    _db_name = _MONGO_URI.split("/")[-1].split("?")[0]
    if _db_name:
        _db = _client[_db_name]
except Exception:
    _db = _client["optiprimes"]


# ─── Local JSON helpers (for alerts, analytics, scan events) ────────
ALERTS_FILE = "data/alerts.json"
ANALYTICS_FILE = "data/analytics.json"
SCAN_EVENTS_FILE = "data/scan_events.json"

os.makedirs("data", exist_ok=True)

_default_analytics = {
    "total_assets": 0,
    "total_scans_performed": 0,
    "total_matches_found": 0,
    "average_similarity_score": 0.0,
    "active_alerts_count": 0,
    "resolved_alerts_count": 0,
    "critical_alerts_count": 0,
    "high_alerts_count": 0,
    "medium_alerts_count": 0,
    "low_alerts_count": 0,
    "top_matched_assets": [],
    "matches_by_severity": {},
}


def _load_json(path: str, default: dict):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return default


def _save_json(path: str, data: dict):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


# ═════════════════════════════════════════════════════════════════════
# AssetDB — NOW READS FROM MONGODB
# ═════════════════════════════════════════════════════════════════════
class AssetDB:
    """
    Reads assets from MongoDB (the 'assets' collection used by the
    Node.js backend).  Converts each MongoDB document into the
    Python Asset model so the rest of the detection engine works
    unchanged.
    """

    def __init__(self):
        self._collection = _db["assets"]

    # ── helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _mongo_doc_to_asset(doc: dict) -> Optional[Asset]:
        """Convert a MongoDB asset document to the Python Asset model.
        
        MongoDB fields:  _id, title, filename, fileUrl, fileHash,
                          ahash, phash, dhash, colorhash, fileType, ...
        Python model:     id, public_id, filename, file_path,
                          ahash, phash, dhash, colorhash, type, ...
        """
        # Skip assets that have no perceptual hashes — they can't be
        # compared and would just waste time.
        ahash = doc.get("ahash") or ""
        phash = doc.get("phash") or ""
        dhash = doc.get("dhash") or ""
        if not ahash or not phash or not dhash:
            return None

        mongo_id = str(doc.get("_id", ""))
        filename = doc.get("filename") or doc.get("title") or "unknown"
        file_url = doc.get("fileUrl") or ""
        colorhash = doc.get("colorhash") or ""

        # Resolve file_path for ORB matching
        # fileUrl can be:  "./database/images/Player/img.jpg"  (seeded)
        #                  "upload://filename"                  (user upload)
        file_path = ""
        if file_url and not file_url.startswith("upload://") and not file_url.startswith("logic://"):
            # Try to resolve relative to project root
            candidate = os.path.normpath(
                os.path.join(os.path.dirname(__file__), "..", "..", file_url)
            )
            if os.path.exists(candidate):
                file_path = candidate

        file_type = doc.get("fileType") or "image"
        asset_type = "video" if file_type == "video" else "image"

        public_id = doc.get("public_id") or f"ASSET-{mongo_id[:8].upper()}"

        try:
            return Asset(
                id=mongo_id,
                public_id=public_id,
                filename=filename,
                file_path=file_path,
                upload_timestamp=doc.get("createdAt") or doc.get("uploadedAt") or datetime.now(),
                type=asset_type,
                ahash=ahash,
                phash=phash,
                dhash=dhash,
                colorhash=colorhash,
                tile_hashes=doc.get("tile_hashes") or [],
                frame_hashes=doc.get("frame_hashes") or [],
                frame_count=doc.get("frame_count") or 0,
                duration_seconds=doc.get("duration_seconds") or 0,
            )
        except Exception:
            return None

    # ── public API (same interface as before) ────────────────────────

    def all_assets(self) -> List[Asset]:
        """Fetch ALL assets with hashes from MongoDB."""
        docs = self._collection.find(
            {
                "ahash": {"$nin": [None, ""]},
                "phash": {"$nin": [None, ""]},
                "dhash": {"$nin": [None, ""]},
            }
        )
        assets = []
        for doc in docs:
            asset = self._mongo_doc_to_asset(doc)
            if asset:
                assets.append(asset)
        return assets

    def add_asset(self, asset: Asset):
        """Insert an asset into MongoDB (used by the Python FastAPI upload endpoint)."""
        doc = {
            "title": asset.filename,
            "filename": asset.filename,
            "fileUrl": asset.file_path or f"upload://{asset.filename}",
            "fileHash": f"logic-{asset.id}",
            "fileType": asset.type,
            "fileSize": 0,
            "status": "active",
            "isProtected": True,
            "platforms": ["other"],
            "source": "logic-engine",
            "ahash": asset.ahash,
            "phash": asset.phash,
            "dhash": asset.dhash,
            "colorhash": asset.colorhash,
            "tile_hashes": asset.tile_hashes,
            "frame_hashes": asset.frame_hashes,
            "frame_count": asset.frame_count,
            "duration_seconds": asset.duration_seconds,
            "createdAt": asset.upload_timestamp,
            "updatedAt": datetime.now(),
        }
        self._collection.insert_one(doc)

    def get_asset(self, asset_id: str) -> Optional[Asset]:
        from bson.objectid import ObjectId
        try:
            doc = self._collection.find_one({"_id": ObjectId(asset_id)})
        except Exception:
            doc = self._collection.find_one({"fileHash": {"$regex": asset_id}})
        if doc:
            return self._mongo_doc_to_asset(doc)
        return None

    def get_asset_by_public_id(self, public_id: str) -> Optional[Asset]:
        doc = self._collection.find_one({"public_id": public_id})
        if doc:
            return self._mongo_doc_to_asset(doc)
        return None

    def delete_asset(self, asset_id: str) -> bool:
        from bson import ObjectId
        try:
            result = self._collection.delete_one({"_id": ObjectId(asset_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    def clear_all_assets(self) -> bool:
        self._collection.delete_many({})
        return True


# ═════════════════════════════════════════════════════════════════════
# AlertDB, AnalyticsDB, ScanEventDB — remain local-JSON (unchanged)
# ═════════════════════════════════════════════════════════════════════

class AlertDB:
    def __init__(self):
        self.path = ALERTS_FILE
        self._load()

    def _load(self):
        raw = _load_json(self.path, {"alerts": []})
        self._alerts: Dict[str, Alert] = {
            a["alert_id"]: Alert(**a) for a in raw.get("alerts", [])
        }

    def _save(self):
        _save_json(self.path, {"alerts": [a.model_dump() for a in self._alerts.values()]})

    def all_alerts(self) -> List[Alert]:
        return list(self._alerts.values())

    def get_alert(self, alert_id: str) -> Optional[Alert]:
        return self._alerts.get(alert_id)

    def find_existing(self, matched_asset_id: str, source_file_name: str) -> Optional[Alert]:
        for alert in self._alerts.values():
            if alert.matched_asset_id == matched_asset_id and alert.source_file_name == source_file_name:
                return alert
        return None

    def upsert_alert(
        self,
        matched_asset_id: str,
        matched_public_id: str,
        source_file_name: str,
        score: float,
        similarity_percentage: float,
        severity: str,
    ) -> Alert:
        existing = self.find_existing(matched_asset_id, source_file_name)
        now = datetime.now()

        if existing:
            existing.last_seen = now
            existing.match_count += 1
            existing.best_score = max(existing.best_score, score)
            existing.similarity_score_out_of_20 = score
            existing.similarity_percentage = similarity_percentage
            existing.timestamp = now
            if existing.status == "resolved":
                existing.status = "new"
            if severity in ("critical", "high"):
                existing.severity = severity  # type: ignore
            self._save()
            return existing

        alert = Alert(
            alert_id=str(uuid4()),
            matched_asset_id=matched_asset_id,
            matched_public_id=matched_public_id,
            source_file_name=source_file_name,
            similarity_score_out_of_20=score,
            similarity_percentage=similarity_percentage,
            timestamp=now,
            status="new",
            severity=severity,  # type: ignore
            first_seen=now,
            last_seen=now,
            match_count=1,
            best_score=score,
        )
        self._alerts[alert.alert_id] = alert
        self._save()
        return alert

    def update_status(self, alert_id: str, status: str):
        if alert_id in self._alerts:
            alert = self._alerts[alert_id]
            alert.status = status  # type: ignore
            alert.timestamp = datetime.now()
            self._save()
            return True
        return False

    def active_count(self) -> int:
        return sum(1 for a in self._alerts.values() if a.status == "new")

    def clear_all_alerts(self) -> bool:
        self._alerts.clear()
        self._save()
        return True


class AnalyticsDB:
    def __init__(self):
        self.path = ANALYTICS_FILE
        self._load()

    def _load(self):
        self._data = _load_json(self.path, _default_analytics)

    def _save(self):
        _save_json(self.path, self._data)

    def get(self):
        return AnalyticsModel(**self._data)

    def increment_scans(self):
        self._data["total_scans_performed"] += 1
        self._save()

    def increment_matches(self):
        self._data["total_matches_found"] += 1
        self._save()

    def update_average_score(self, score: float):
        count = self._data["total_matches_found"]
        current = self._data["average_similarity_score"]
        if count <= 1:
            avg = score
        else:
            avg = ((current * (count - 1)) + score) / count
        self._data["average_similarity_score"] = avg
        self._save()

    def set_total_assets(self, n: int):
        self._data["total_assets"] = n
        self._save()

    def set_active_alerts_count(self, n: int):
        self._data["active_alerts_count"] = n
        self._save()

    def set_resolved_alerts_count(self, n: int):
        self._data["resolved_alerts_count"] = n
        self._save()

    def set_severity_counts(self, critical: int, high: int, medium: int, low: int):
        self._data["critical_alerts_count"] = critical
        self._data["high_alerts_count"] = high
        self._data["medium_alerts_count"] = medium
        self._data["low_alerts_count"] = low
        self._save()

    def set_top_matched_assets(self, assets: list[dict]):
        self._data["top_matched_assets"] = assets
        self._save()

    def set_matches_by_severity(self, counts: dict):
        self._data["matches_by_severity"] = counts
        self._save()


class ScanEventDB:
    def __init__(self):
        self.path = SCAN_EVENTS_FILE
        self._load()

    def _load(self):
        raw = _load_json(self.path, {"events": []})
        self._events: Dict[str, ScanEvent] = {
            e["event_id"]: ScanEvent(**e) for e in raw.get("events", [])
        }

    def _save(self):
        _save_json(self.path, {"events": [e.model_dump() for e in self._events.values()]})

    def add_event(self, event: ScanEvent):
        self._events[event.event_id] = event
        self._save()

    def all_events(self) -> List[ScanEvent]:
        return list(self._events.values())