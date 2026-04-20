from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime


class QueuePrediction(BaseModel):
    location_id: str
    location_type: Literal['kiosk', 'restroom', 'exit']
    venue_id: str
    predicted_wait_minutes: float
    confidence_score: float  # 0-1
    generated_at: datetime
    model_version: str


class PredictionRequest(BaseModel):
    venue_id: str
    location_id: str
    location_type: Literal['kiosk', 'restroom', 'exit']
    current_density: float       # 0-1
    time_of_day_hour: int        # 0-23
    event_phase: Literal['pre_show', 'halftime', 'post_show', 'general']
    historical_throughput: Optional[float] = None
    weather_condition: Optional[str] = None
