from fastapi import FastAPI
from app.routes import router

app = FastAPI(title='VenueFlow ML Pipeline')
app.include_router(router)


@app.get('/health')
async def health():
    return {'status': 'ok'}
