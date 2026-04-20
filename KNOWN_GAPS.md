# KNOWN_GAPS.md — VenueFlow

This document transparently lists known gaps between the current implementation and the full production specification. These are intentional trade-offs made for the fast-track submission deadline.

---

## 1. HTTP Framework — Express vs Fastify

**Gap:** All Node.js services use Express 4.x. The tech stack spec mandates Fastify 4.x.

**Reason:** Express was used for faster initial scaffolding. Fastify provides lower overhead and built-in schema validation.

**Migration path:** Replace `express` with `fastify` + `@fastify/jwt` + `@fastify/sensible` per service. Route handlers are thin wrappers — migration is mechanical.

---

## 2. ORM — pg (raw SQL) vs Prisma

**Gap:** Services use `pg` (node-postgres) with raw SQL. The tech stack spec mandates Prisma 5.x with managed migrations.

**Reason:** Raw SQL was faster to scaffold. Prisma provides type-safe queries and migration management.

**Migration path:** Add `prisma/schema.prisma` per service, run `prisma migrate dev`, replace `pool.query()` calls with Prisma client calls.

---

## 3. Cloud Infrastructure — Docker Compose vs AWS

**Gap:** All infrastructure runs on Docker Compose locally. Production spec requires AWS (ECS Fargate, RDS, ElastiCache, MSK, Route 53, CDK).

**Reason:** Cloud provisioning requires credentials and takes hours. Docker Compose provides a fully functional local stack.

**Migration path:** See `infra/TODO_CLOUD.md` for CDK stack outlines.

---

## 4. ML Pipeline — EMA Fallback vs Trained XGBoost

**Gap:** Queue Predictor uses a deterministic formula + EMA fallback. A trained XGBoost model artifact is not yet available.

**Reason:** Training requires historical event data which is not available pre-launch.

**Migration path:** Collect event data from first 3 events, train XGBoost model, upload to S3, set `MODEL_VERSION` env var.

---

## 5. BLE Mesh Alert Delivery

**Gap:** BLE mesh broadcast is scaffolded in Notification Service but hardware integration is not implemented.

**Reason:** Requires physical BLE beacon hardware for testing.

**Migration path:** Implement `react-native-ble-advertiser` integration in Mobile App Task 8.

---

## 6. Threat Detection — LSTM Model

**Gap:** Threat Detection Service is stubbed. LSTM model for movement anomaly detection is not trained.

**Reason:** Requires labelled movement sequence data from real events.

**Migration path:** Implement `services/threat-detection/` using TensorFlow/Keras LSTM per design spec.

---

## 7. GDPR Account Deletion Cascade

**Gap:** `DELETE /auth/account` soft-deletes and anonymizes the user record but does not cascade to all downstream services (entry events, incident reports, gamification events).

**Reason:** Cross-service GDPR cascade requires a saga pattern or event-driven deletion pipeline.

**Migration path:** Publish `user.deleted` Kafka event on account deletion; each service subscribes and anonymizes its own records.

---

## 8. FCM / APNs Push Delivery

**Gap:** Push notifications are console-logged. Firebase Admin SDK and APNs credentials are not provisioned.

**Reason:** Requires Firebase project setup and Apple Developer account.

**Migration path:** Add `firebase-admin` SDK, provision service account credentials in AWS Secrets Manager.

---

## 9. Property Tests P8–P32 (Partial)

**Gap:** Property tests P1–P7, P10–P12, P15–P17 are fully implemented. P8–P9 use Hypothesis. P13, P18–P19 are scaffolded. P20–P32 are marked as TODO.

**Migration path:** Implement remaining property tests as Phase 2–4 services are completed.

---

## 10. Load Testing

**Gap:** k6 load test scripts are not written. 500k concurrent user test has not been run.

**Migration path:** Write k6 scripts in `tools/load-test/`, run against staging environment on AWS.

---

## 11. Mobile App (Task 8)

**Gap:** Mobile App (React Native) has not been built yet. Phase 1 backend is complete.

**Migration path:** Implement Task 8 — offline-first storage, pre-event sync, heatmap view, QR ticket, AR navigation, voice commands.
