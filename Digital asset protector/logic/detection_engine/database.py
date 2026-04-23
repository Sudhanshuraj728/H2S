import json
import os
from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4


from models import Asset, Alert, Analytics as AnalyticsModel, ScanEvent


ASSETS_FILE = "data/assets.json"
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



class AssetDB:
    def __init__(self):
        self.path = ASSETS_FILE
        self._load()


    # database.py - FIX AssetDB._load() method (around line 60)
    def _load(self):
        """Load assets with backward compatibility for missing fields"""
        raw = _load_json(self.path, {"assets": []})
        self._assets: Dict[str, Asset] = {}
        
        for a in raw.get("assets", []):
            # BACKWARD COMPATIBILITY: Add missing fields for old data
            a.setdefault("public_id", f"ASSET-{a['id'][:8].upper()}")  # Generate from ID
            a.setdefault("colorhash", "")
            a.setdefault("tile_hashes", [])
            
            self._assets[a["id"]] = Asset(**a)


    def _save(self):
        """NEW: Automatically preserves new fields (colorhash, tile_hashes, public_id)"""
        _save_json(self.path, {"assets": [a.model_dump() for a in self._assets.values()]})


    def all_assets(self) -> List[Asset]:
        return list(self._assets.values())


    def add_asset(self, asset: Asset):
        self._assets[asset.id] = asset
        self._save()


    def get_asset(self, asset_id: str) -> Optional[Asset]:
        return self._assets.get(asset_id)


    def get_asset_by_public_id(self, public_id: str) -> Optional[Asset]:
        """NEW: Lookup asset by user-friendly public_id (ASSET-XXXXXXXX)"""
        for asset in self._assets.values():
            if asset.public_id == public_id:
                return asset
        return None


    def delete_asset(self, asset_id: str) -> bool:
        """Delete a single asset by its UUID or public_id"""
        # Try direct UUID lookup first
        if asset_id in self._assets:
            del self._assets[asset_id]
            self._save()
            return True
        # Try public_id lookup
        for key, asset in self._assets.items():
            if asset.public_id == asset_id:
                del self._assets[key]
                self._save()
                return True
        return False


    def clear_all_assets(self) -> bool:
        """Delete ALL assets from the database"""
        self._assets.clear()
        self._save()
        return True



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
        matched_public_id: str,  # NEW: accepts matched_public_id
        source_file_name: str,
        score: float,
        similarity_percentage: float,
        severity: str,
    ) -> Alert:
        """UPDATED: Now takes matched_public_id parameter"""
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
            matched_public_id=matched_public_id,  # NEW: store public_id
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
        """Delete ALL alerts from the database"""
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