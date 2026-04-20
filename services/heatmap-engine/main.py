# Heatmap Engine — VenueFlow
# FastAPI service that consumes sensor.readings from Kafka using 10-second tumbling windows,
# classifies zone density (green/yellow/red/unavailable), writes ZoneDensitySnapshot records
# to TimescaleDB, and publishes heatmap deltas to Redis channel heatmap:{venueId}.
# Endpoints: GET /heatmap/{venueId}, GET /heatmap/{venueId}/zones/{zoneId},
#            GET /heatmap/{venueId}/replay

from fastapi import FastAPI

app = FastAPI(title="VenueFlow Heatmap Engine")


@app.get("/health")
def health():
    return {"status": "ok", "service": "heatmap-engine"}
