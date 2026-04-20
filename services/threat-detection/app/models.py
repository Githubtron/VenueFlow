from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime


class ThreatAlert(BaseModel):
    alert_id: str
    venue_id: str
    event_id: str
    zone_id: str
    alert_type: Literal['suspicious_movement', 'unauthorized_access', 'watchlist_match']
    session_token: str
    anomaly_score: float
    model_version: str
    detected_at: datetime
    status: Literal['active', 'resolved'] = 'active'
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None


class ZoneTransition(BaseModel):
    session_token: str
    zone_id: str
    venue_id: str
    event_id: str
    timestamp: str
