"""
ML Pipeline REST endpoints.
Validates: Requirements 26.1, 26.2
"""
from fastapi import APIRouter, HTTPException
from app.trainer import run_retraining, get_model_versions, get_current_model

router = APIRouter()


@router.get('/ml/models/{service_id}')
async def get_versions(service_id: str):
    versions = get_model_versions(service_id)
    return {'service_id': service_id, 'versions': versions, 'count': len(versions)}


@router.post('/ml/retrain/{event_id}')
async def trigger_retraining(event_id: str, service_id: str = 'queue-predictor'):
    result = await run_retraining(service_id, event_id, [])
    return result


@router.get('/ml/models/{service_id}/active')
async def get_active_model(service_id: str):
    current = get_current_model(service_id)
    if not current:
        raise HTTPException(status_code=404, detail=f'No active model for {service_id}')
    return current
