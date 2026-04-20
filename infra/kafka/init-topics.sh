#!/bin/bash
# VenueFlow Kafka Topic Initialization
# Creates all required topics with 7-day retention, replication factor 1 (local dev), 3 partitions.
# Run once after Kafka broker is healthy.

set -e

BOOTSTRAP="${KAFKA_BOOTSTRAP_SERVERS:-localhost:9092}"
PARTITIONS=3
REPLICATION=1
RETENTION_MS=604800000  # 7 days in milliseconds

echo "Waiting for Kafka broker at ${BOOTSTRAP}..."
until kafka-topics --bootstrap-server "${BOOTSTRAP}" --list > /dev/null 2>&1; do
  echo "  Kafka not ready yet, retrying in 5s..."
  sleep 5
done
echo "Kafka is ready."

create_topic() {
  local TOPIC=$1
  echo "Creating topic: ${TOPIC}"
  kafka-topics \
    --bootstrap-server "${BOOTSTRAP}" \
    --create \
    --if-not-exists \
    --topic "${TOPIC}" \
    --partitions "${PARTITIONS}" \
    --replication-factor "${REPLICATION}" \
    --config retention.ms="${RETENTION_MS}"
  echo "  Done: ${TOPIC}"
}

# IoT sensor data
create_topic "sensor.readings"
create_topic "sensor.failures"

# Queue predictions
create_topic "queue.predictions"

# Emergency & safety
create_topic "emergency.sos"
create_topic "threat.alerts"
create_topic "incident.reports"

# Gamification & rewards
create_topic "gamification.events"

# External data enrichment (weather, traffic)
create_topic "external.enrichment"

# ML model retraining triggers
create_topic "ml.retraining.trigger"

echo ""
echo "All VenueFlow Kafka topics created successfully."
kafka-topics --bootstrap-server "${BOOTSTRAP}" --list
