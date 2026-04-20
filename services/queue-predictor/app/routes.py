"""
Queue Predictor REST endpoints.

GET  /queues/{venue_id}                              — all predictions for venue
GET  /queues/{venue_id}/kiosk/{kiosk_id}             — single kiosk prediction
GET  /queues/{venue_id}/kiosk/{kiosk_id}/alternatives — kiosks with shorter wait

Validates: Requirements 3.2, 3.5
"""
from fastapi import APIRouter, HTTPException, Request
from app.predictor import find_alternatives

router = APIRouter()


@router.get('/queues/{venue_id}')
async def get_all_predictions(venue_id: str, request: Request):
    store = request.app.state.store
    predictions = store.get_all(venue_id)
    return {
        'venue_id': venue_id,
        'predictions': [p.model_dump() for p in predictions],
        'count': len(predictions),
    }


@router.get('/queues/{venue_id}/kiosk/{kiosk_id}')
async def get_kiosk_prediction(venue_id: str, kiosk_id: str, request: Request):
    store = request.app.state.store
    prediction = store.get_one(venue_id, kiosk_id)
    if prediction is None:
        raise HTTPException(
            status_code=404,
            detail=f'No prediction found for kiosk {kiosk_id} in venue {venue_id}',
        )
    return prediction.model_dump()


@router.get('/queues/{venue_id}/kiosk/{kiosk_id}/alternatives')
async def get_alternatives(venue_id: str, kiosk_id: str, request: Request):
    store = request.app.state.store
    all_predictions = store.get_all(venue_id)
    predictions_dicts = [p.model_dump() for p in all_predictions]

    alternatives = find_alternatives(predictions_dicts, kiosk_id)
    return {
        'venue_id': venue_id,
        'kiosk_id': kiosk_id,
        'alternatives': alternatives,
    }
