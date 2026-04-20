/**
 * Amazon MSK (Kafka) Production Configuration
 * Validates: Requirements 7.1, 7.2, 7.4, 8.1
 *
 * Replication factor 3, min.insync.replicas=2
 * 7-day retention on all topics
 * 500k+ concurrent sensor event streams
 */

export const KAFKA_PRODUCTION_CONFIG = {
  // MSK cluster settings
  cluster: {
    kafkaVersion: '3.7.x',
    numberOfBrokerNodes: 3,
    instanceType: 'kafka.m5.4xlarge',  // 16 vCPU, 64GB RAM per broker
    storageGiB: 2000,
    multiAZ: true,
  },

  // Topic defaults
  topicDefaults: {
    replicationFactor: 3,
    minInsyncReplicas: 2,
    retentionMs: 604800000,  // 7 days
    partitions: 12,          // 12 partitions for high throughput
  },

  // Per-topic overrides
  topics: {
    'sensor.readings':      { partitions: 50 },  // High volume — 500k streams
    'emergency.sos':        { partitions: 6, retentionMs: 2592000000 },  // 30 days
    'queue.predictions':    { partitions: 12 },
    'threat.alerts':        { partitions: 6 },
    'incident.reports':     { partitions: 6 },
    'gamification.events':  { partitions: 12 },
    'external.enrichment':  { partitions: 6 },
    'ml.retraining.trigger':{ partitions: 3 },
    'sensor.failures':      { partitions: 6 },
  },

  // Producer settings for reliability
  producer: {
    acks: 'all',      // Wait for all in-sync replicas
    retries: 3,
    compressionType: 'lz4',
    batchSize: 65536,
    lingerMs: 5,
  },

  // Consumer settings
  consumer: {
    autoOffsetReset: 'latest',
    enableAutoCommit: true,
    maxPollRecords: 500,
    fetchMaxBytes: 52428800,  // 50MB
  },
};
