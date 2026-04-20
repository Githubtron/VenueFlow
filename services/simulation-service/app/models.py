from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime


class SimulationRequest(BaseModel):
    venue_id: str
    event_id: str
    expected_attendance: int
    seat_zone_distribution: dict[str, float]  # {zone_id: fraction 0-1}
    event_start_time: str  # ISO 8601


class GateForecast(BaseModel):
    gate_id: str
    zone_id: str
    expected_arrivals: int
    peak_queue_depth: int
    peak_time_offset_minutes: int  # minutes before event start


class StaffDeploymentPlan(BaseModel):
    zone_id: str
    recommended_staff_count: int
    role: str
    reason: str


class SimulationResult(BaseModel):
    simulation_run_id: str
    venue_id: str
    event_id: str
    status: Literal['pending', 'running', 'completed', 'failed']
    gate_forecasts: list[GateForecast]
    staff_deployment_plan: list[StaffDeploymentPlan]
    created_at: datetime
    completed_at: Optional[datetime] = None
