import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.routes import router
from app.store import AlertStore

REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.store = AlertStore(REDIS_URL)
    yield


app = FastAPI(title='VenueFlow Threat Detection', lifespan=lifespan)
app.include_router(router)


@app.get('/health')
async def health():
    return {'status': 'ok'}
