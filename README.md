# VenueFlow

**Real-Time Smart Fan Experience Platform for Large-Scale Events**

VenueFlow is a mobile-first, AI-powered crowd management platform for stadiums, music festivals, religious gatherings, and national events. It uses real-time IoT sensor data, predictive AI, and live indoor navigation to eliminate crowd bottlenecks, reduce entry wait times, and coordinate attendees with venue operations staff.

---

## Architecture

```
IoT Sensors → MQTT → IoT Gateway → Kafka → Heatmap Engine → Redis → WebSocket Gateway → Mobile App
                                        ↓
                                   Entry Router → PostgreSQL
                                        ↓
                                 Wayfinding Engine
                                        ↓
                              Notification Service (FCM/APNs/SMS/BLE)
```

Full architecture: see `.kiro/specs/venueflow-platform/design.md`

---

## How to Run (Local)

### Prerequisites
- Docker Desktop
- Node.js 20 LTS
- Python 3.11+
- pnpm 9.x

### 1. Start infrastructure

```bash
docker compose -f infra/docker-compose.yml up -d
```

Wait for all services to be healthy:
```bash
docker compose -f infra/docker-compose.yml ps
```

### 2. Create Kafka topics

```bash
docker exec venueflow-kafka bash /init-topics.sh
```

### 3. Install dependencies

```bash
# Node.js services
npm install

# Python services
cd services/heatmap-engine && pip install -r requirements.txt
cd services/queue-predictor && pip install -r requirements.txt
cd services/simulation-service && pip install -r requirements.txt
```

### 4. Run database migrations

```bash
# Auth Service
psql postgresql://venueflow:venueflow_dev@localhost:5432/venueflow \
  -f services/auth-service/src/db/migrations/001_init.sql

# Entry Router
psql postgresql://venueflow:venueflow_dev@localhost:5432/venueflow \
  -f services/entry-router/src/db/migrations/001_entry_events.sql
```

### 5. Start services

```bash
# Auth Service (port 3001)
cd services/auth-service && npm start

# Entry Router (port 3002)
cd services/entry-router && npm start

# Notification Service (port 3003, WS port 3010)
cd services/notification-service && npm start

# Wayfinding Engine (port 3004)
cd services/wayfinding-engine && npm start

# Heatmap Engine (port 8000)
cd services/heatmap-engine && uvicorn app.main:app --port 8000

# Queue Predictor (port 8001)
cd services/queue-predictor && uvicorn app.main:app --port 8001
```

---

## Running Tests

```bash
# All Node.js services
npm test --workspaces --if-present

# Heatmap Engine (includes Hypothesis property tests)
cd services/heatmap-engine && pytest

# Queue Predictor (includes Hypothesis property tests)
cd services/queue-predictor && pytest
```

---

## Services

| Service | Port | Tech | Status |
|---|---|---|---|
| auth-service | 3001 | Node.js + Express | ✅ Built |
| entry-router | 3002 | Node.js + Express | ✅ Built |
| notification-service | 3003 / WS:3010 | Node.js + Express + ws | ✅ Built |
| wayfinding-engine | 3004 | Node.js + Express | ✅ Built |
| queue-predictor | 8001 | FastAPI + Python | ✅ Built |
| vendor-intelligence | 3006 | Node.js + Express | ✅ Built |
| staff-management | 3007 | Node.js + Express | ✅ Built |
| emergency-coordinator | 3008 | Node.js + Express | ✅ Built |
| rewards-service | 3009 | Node.js + Express | ✅ Built |
| external-integration | 3011 | Node.js + Express | ✅ Built |
| incident-service | 3012 | Node.js + Express | ✅ Built |
| compliance-service | 3013 | Node.js + Express | ✅ Built |
| heatmap-engine | 8000 | FastAPI + Python | ✅ Built |
| simulation-service | 8002 | FastAPI + Python | ✅ Built |
| threat-detection | 8003 | FastAPI + Python | ✅ Built |
| analytics-service | 8004 | FastAPI + Python | ✅ Built |
| ml-pipeline | 8005 | FastAPI + Python | ✅ Built |
| sponsor-analytics | 8006 | FastAPI + Python | ✅ Built |
| iot-gateway | — | Node.js (MQTT bridge) | ✅ Built |
| mobile app | — | React Native | 🔲 Pending (Task 8) |
| ops dashboard | — | React Web | 🔲 Pending (Task 15/26/31) |

---

## Known Gaps

See `KNOWN_GAPS.md` for a full list of intentional trade-offs and migration paths.

Key gaps:
- Express used instead of Fastify (migration path documented)
- Raw SQL used instead of Prisma (migration path documented)
- Running on Docker Compose instead of AWS (CDK stacks outlined in `infra/TODO_CLOUD.md`)
- ML model uses EMA fallback (XGBoost training requires real event data)
- Mobile App not yet built (Task 8)

---

## Spec & Design Documents

- Requirements: `.kiro/specs/venueflow-platform/requirements.md`
- Design: `.kiro/specs/venueflow-platform/design.md`
- Tasks: `.kiro/specs/venueflow-platform/tasks.md`
- Backend API contracts: `BACKEND-STRUCTURE.md`
- Frontend guidelines: `FRONTEND-GUIDELINES.md`
- Tech stack: `TECH-STACK.md`
