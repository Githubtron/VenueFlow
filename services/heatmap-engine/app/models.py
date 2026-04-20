from pydantic import BaseModel
from typing import Literal
from datetime import datetime


class ZoneDensitySnapshot(BaseModel):
    zone_id: str
    venue_id: str
    current_count: int
    density_percent: float
    status: Literal['green', 'amber', 'red', 'unavailable']
    last_updated: datetime
    data_available: bool


class ZoneConfig(BaseModel):
    zone_id: str
    venue_id: str
    capacity: int
    red_zone_threshold: float = 0.8
    yellow_zone_threshold: float = 0.5
