import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.routes import router
from app.offers import OfferDeliveryService

REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
TIMESCALEDB_URL = os.getenv('TIMESCALEDB_URL', '')


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.offer_service = OfferDeliveryService(REDIS_URL)
    if TIMESCALEDB_URL:
        try:
            import asyncpg
            app.state.db_pool = await asyncpg.create_pool(TIMESCALEDB_URL, min_size=2, max_size=5)
        except Exception as e:
            print(f'[sponsor-analytics] DB connection failed: {e}')
            app.state.db_pool = None
    else:
        app.state.db_pool = None
    yield
    if getattr(app.state, 'db_pool', None):
        await app.state.db_pool.close()


app = FastAPI(title='VenueFlow Sponsor Analytics', lifespan=lifespan)
app.include_router(router)


@app.get('/health')
async def health():
    return {'status': 'ok'}
