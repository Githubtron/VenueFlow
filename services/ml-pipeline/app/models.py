from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MLModelVersion(BaseModel):
    version_id: str
    service_id: str
    trained_at: datetime
    training_event_ids: list[str]
    mape: float
    is_active: bool
    s3_model_path: str
    promoted_at: Optional[datetime] = None
    promoted_by: Optional[str] = None


class RetrainingResult(BaseModel):
    run_id: str
    service_id: str
    event_id: str
    new_mape: float
    current_mape: float
    promoted: bool
    reason: str
    completed_at: datetime
