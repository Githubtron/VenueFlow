"""
Post-event model retraining pipeline.

Property 30: Post-Event Retraining Promotion Guard
Feature: venueflow-platform, Property 30: Post-Event Retraining Promotion Guard
Validates: Requirements 26.1, 26.2

Property 29: ML Model Version Traceability
Feature: venueflow-platform, Property 29: ML Model Version Traceability
Validates: Requirements 26.2
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# In-memory model registry (replace with PostgreSQL in production)
_model_registry: dict[str, list[dict]] = {}


def get_current_model(service_id: str) -> Optional[dict]:
    """Returns the currently active model for a service."""
    versions = _model_registry.get(service_id, [])
    active = [v for v in versions if v['is_active']]
    return active[-1] if active else None


def register_model(version: dict) -> None:
    """Register a new model version."""
    service_id = version['service_id']
    if service_id not in _model_registry:
        _model_registry[service_id] = []
    _model_registry[service_id].append(version)


def promote_model(service_id: str, version_id: str, promoted_by: str = 'system') -> bool:
    """
    Promote a model version to active.
    Deactivates all other versions for the service.
    """
    versions = _model_registry.get(service_id, [])
    found = False
    for v in versions:
        if v['version_id'] == version_id:
            v['is_active'] = True
            v['promoted_at'] = datetime.now(timezone.utc).isoformat()
            v['promoted_by'] = promoted_by
            found = True
        else:
            v['is_active'] = False
    return found


def should_promote(new_mape: float, current_mape: float) -> bool:
    """
    Property 30: New model is promoted iff new_mape < current_mape.
    Strictly better performance required for promotion.
    """
    return new_mape < current_mape


async def run_retraining(
    service_id: str,
    event_id: str,
    training_data: list[dict],
) -> dict:
    """
    Simulate post-event retraining pipeline.
    In production: exports data to S3, trains XGBoost, evaluates MAPE.
    """
    run_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # Simulate MAPE computation from training data
    if training_data:
        errors = [abs(d.get('predicted', 0) - d.get('actual', 0)) / max(d.get('actual', 1), 1) for d in training_data]
        new_mape = sum(errors) / len(errors) if errors else 0.15
    else:
        new_mape = 0.15  # baseline

    current = get_current_model(service_id)
    current_mape = current['mape'] if current else 1.0

    promoted = should_promote(new_mape, current_mape)
    version_id = f'{service_id}-{now.strftime("%Y%m%d%H%M%S")}'
    s3_path = f's3://venueflow-models/{service_id}/{version_id}/model.joblib'

    new_version = {
        'version_id': version_id,
        'service_id': service_id,
        'trained_at': now.isoformat(),
        'training_event_ids': [event_id],
        'mape': new_mape,
        'is_active': False,
        's3_model_path': s3_path,
    }
    register_model(new_version)

    if promoted:
        promote_model(service_id, version_id)
        reason = f'New MAPE {new_mape:.4f} < current MAPE {current_mape:.4f} — promoted'
    else:
        reason = f'New MAPE {new_mape:.4f} >= current MAPE {current_mape:.4f} — not promoted'

    logger.info(f'[ml-pipeline] {service_id} retraining: {reason}')

    return {
        'run_id': run_id,
        'service_id': service_id,
        'event_id': event_id,
        'new_mape': new_mape,
        'current_mape': current_mape,
        'promoted': promoted,
        'version_id': version_id,
        'reason': reason,
        'completed_at': now.isoformat(),
    }


def get_model_versions(service_id: str) -> list[dict]:
    return _model_registry.get(service_id, [])


def get_active_version_id(service_id: str) -> Optional[str]:
    """Returns the version_id of the currently active model."""
    current = get_current_model(service_id)
    return current['version_id'] if current else None
