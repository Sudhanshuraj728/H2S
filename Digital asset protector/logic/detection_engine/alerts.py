# alerts.py
from typing import List


from database import AlertDB
from models import Alert



ALERT_DB = AlertDB()



def get_all_alerts() -> List[Alert]:
    """Get all alerts with full details including matched_public_id"""
    return ALERT_DB.all_alerts()


def resolve_alert(alert_id: str) -> bool:
    """Resolve alert by ID, updates timestamp automatically"""
    success = ALERT_DB.update_status(alert_id, "resolved")
    return success


def get_alert_by_id(alert_id: str) -> Alert | None:
    """NEW: Get single alert by ID"""
    return ALERT_DB.get_alert(alert_id)


def get_alerts_by_asset(asset_id: str) -> List[Alert]:
    """NEW: Get all alerts for specific asset ID"""
    return [a for a in ALERT_DB.all_alerts() if a.matched_asset_id == asset_id]


def get_alerts_by_public_id(public_id: str) -> List[Alert]:
    """NEW: Get all alerts for asset public_id (ASSET-XXXXXXXX)"""
    asset = ALERT_DB.get_asset_by_public_id(public_id) if hasattr(ALERT_DB, 'get_asset_by_public_id') else None
    if not asset:
        return []
    return [a for a in ALERT_DB.all_alerts() if a.matched_asset_id == asset.id]


def get_active_alerts() -> List[Alert]:
    """NEW: Get only active (new) alerts"""
    return [a for a in ALERT_DB.all_alerts() if a.status == "new"]


def get_alerts_by_severity(severity: str) -> List[Alert]:
    """NEW: Filter alerts by severity (low/medium/high/critical)"""
    return [a for a in ALERT_DB.all_alerts() if a.severity == severity]


def get_alert_stats() -> dict:
    """NEW: Quick stats summary"""
    alerts = ALERT_DB.all_alerts()
    return {
        "total": len(alerts),
        "active": len([a for a in alerts if a.status == "new"]),
        "resolved": len([a for a in alerts if a.status == "resolved"]),
        "by_severity": {
            "critical": len([a for a in alerts if a.severity == "critical"]),
            "high": len([a for a in alerts if a.severity == "high"]),
            "medium": len([a for a in alerts if a.severity == "medium"]),
            "low": len([a for a in alerts if a.severity == "low"]),
        }
    }