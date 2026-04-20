import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.routes import router
from app.store import PredictionStore
from app.scheduler import start_scheduler

REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
LOCATIONS_JSON = os.getenv('LOCATIONS_JSON', '[]')


@asynccontextmanager
async def lifespan(app: FastAPI):
    store = PredictionStore(REDIS_URL)
    app.state.store = store

    locations = json.loads(LOCATIONS_JSON)
    if locations:
        start_scheduler(store, REDIS_URL, locations)

    yield


app = FastAPI(title='VenueFlow Queue Predictor', lifespan=lifespan)
app.include_router(router)


@app.get('/health')
async def health():
    return {'status': 'ok'}
