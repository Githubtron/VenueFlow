# TODO_CLOUD.md — VenueFlow Cloud Infrastructure

Current state: Docker Compose (local dev only).
Target state: AWS multi-region production deployment.

---

## AWS Services Required

| Service | Purpose | Status |
|---|---|---|
| Amazon ECS Fargate | Container orchestration for all microservices | TODO |
| Amazon RDS PostgreSQL 16 (Multi-AZ) | Primary relational database | TODO |
| Amazon ElastiCache Redis 7.2 (Cluster) | Cache + pub/sub | TODO |
| Amazon MSK (Kafka 3.7 KRaft) | Managed Kafka, replication factor 3 | TODO |
| Amazon S3 | Venue maps, ML models, analytics reports | TODO |
| AWS API Gateway + ALB | Rate limiting, auth header injection | TODO |
| Amazon Route 53 | Health-check failover (≤10s cross-region) | TODO |
| Amazon CloudFront | CDN for mobile app assets and map tiles | TODO |
| AWS Secrets Manager | API keys, DB credentials, Kafka creds | TODO |
| Amazon CloudWatch + Datadog | Metrics, logs, APM tracing | TODO |
| AWS X-Ray | Distributed request tracing | TODO |
| AWS CDK (TypeScript) | IaC — all stacks defined in `infra/cdk/` | TODO |

---

## CDK Stacks to Create

```
infra/cdk/
  stacks/
    network-stack.ts       — VPC, subnets, security groups
    database-stack.ts      — RDS PostgreSQL + TimescaleDB
    cache-stack.ts         — ElastiCache Redis Cluster
    kafka-stack.ts         — Amazon MSK
    ecs-stack.ts           — ECS Cluster + Fargate task definitions
    api-gateway-stack.ts   — API Gateway + ALB
    dns-stack.ts           — Route 53 health checks + failover
    cdn-stack.ts           — CloudFront distributions
    secrets-stack.ts       — Secrets Manager entries
    monitoring-stack.ts    — CloudWatch dashboards + alarms
```

---

## Kafka Production Config

```
replication.factor=3
min.insync.replicas=2
retention.ms=604800000  (7 days)
auto.create.topics.enable=false
```

---

## Multi-Region Failover

- Primary region: ap-south-1 (Mumbai) — closest to Kumbh Mela, IPL events
- Warm standby: ap-southeast-1 (Singapore)
- Route 53 health checks: 10s failover SLA (Requirement 8.5)
- RDS read replica in standby region, promoted on failover
