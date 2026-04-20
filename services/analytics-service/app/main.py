import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.routes import router

TIMESCALEDB_URL = os.getenv('TIMESCALEDB_URL', '')
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to TimescaleDB if URL provided
    if TIMESCALEDB_URL:
        try:
            import asyncpg
            pool = await asyncpg.create_pool(TIMESCALEDB_URL, min_size=2, max_size=10)
            app.state.db_pool = pool
        except Exception as e:
            print(f'[analytics] TimescaleDB connection failed: {e} — running in stub mode')
            app.state.db_pool = None
    else:
        app.state.db_pool = None
    yield
    if getattr(app.state, 'db_pool', None):
        await app.state.db_pool.close()


app = FastAPI(title='VenueFlow Analytics Service', lifespan=lifespan)
app.include_router(router)


@app.get('/health')
async def health():
    return {'status': 'ok', 'db_connected': getattr(app.state, 'db_pool', None) is not None}
