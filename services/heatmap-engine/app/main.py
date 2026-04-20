import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.routes import router
from app.store import HeatmapStore
from app.aggregator import WindowAggregator
from app.consumer import start_consumer

KAFKA_BROKERS = os.getenv('KAFKA_BROKERS', 'localhost:9092')
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
STALE_THRESHOLD_SECONDS = int(os.getenv('STALE_THRESHOLD_SECONDS', '30'))


@asynccontextmanager
async def lifespan(app: FastAPI):
    store = HeatmapStore(REDIS_URL)
    aggregator = WindowAggregator()
    app.state.store = store
    app.state.aggregator = aggregator
    start_consumer(store, aggregator, KAFKA_BROKERS, STALE_THRESHOLD_SECONDS)
    yield


app = FastAPI(title='VenueFlow Heatmap Engine', lifespan=lifespan)
app.include_router(router)


@app.get('/health')
async def health():
    return {'status': 'ok'}
