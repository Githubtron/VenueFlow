from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime


class ZoneSnapshot(BaseModel):
    zone_id: str
    venue_id: str
    current_count: int
    density_percent: float
    status: Literal['green', 'amber', 'red', 'unavailable']
    last_updated: datetime
    data_available: bool


class ReplayFrame(BaseModel):
    timestamp: datetime
    zones: list[ZoneSnapshot]


class CongestionBucket(BaseModel):
    bucket_start: datetime
    bucket_end: datetime
    venue_id: str
    zone_id: str
    avg_density: float
    peak_density: float
    avg_count: int


class IncidentSummary(BaseModel):
    incident_type: str
    zone_id: str
    count: int
    avg_resolution_seconds: Optional[float]


class PostEventReport(BaseModel):
    report_id: str
    venue_id: str
    event_id: str
    generated_at: datetime
    total_attendance: int
    peak_density_zones: list[str]
    avg_entry_wait_minutes: float
    total_incidents: int
    total_sos_signals: int
    evacuation_events: int
    avg_incident_resolution_seconds: float
    format: str = 'json'
