# Queue Predictor — VenueFlow
# FastAPI + XGBoost service that generates wait time predictions every 60 seconds
# for all active kiosks, restrooms, and exit gates. Falls back to exponential moving
# average when model confidence < 0.6. Publishes predictions to queue.predictions Kafka topic.
# Endpoints: GET /queues/{venueId}, GET /queues/{venueId}/kiosk/{kioskId},
#            GET /queues/{venueId}/kiosk/{kioskId}/alternatives

from fastapi import FastAPI

app = FastAPI(title="VenueFlow Queue Predictor")


@app.get("/health")
def health():
    return {"status": "ok", "service": "queue-predictor"}
