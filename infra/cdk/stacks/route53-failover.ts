/**
 * Route 53 Health-Check Failover Configuration
 * Validates: Requirements 8.5
 *
 * Primary region: ap-south-1 (Mumbai)
 * Warm standby: ap-southeast-1 (Singapore)
 * Failover SLA: ≤10 seconds
 *
 * TODO: Deploy with `cdk deploy Route53FailoverStack`
 */

export const FAILOVER_CONFIG = {
  primaryRegion: 'ap-south-1',
  standbyRegion: 'ap-southeast-1',

  // Route 53 health check settings
  healthCheck: {
    // Check every 10s — minimum for fast failover
    requestIntervalSeconds: 10,
    // Fail after 1 consecutive failure (10s detection)
    failureThreshold: 1,
    // Health check path
    resourcePath: '/health',
    port: 443,
    protocol: 'HTTPS',
  },

  // DNS TTL — low TTL enables fast failover propagation
  ttlSeconds: 10,

  // RDS replication
  rds: {
    // Continuous replication from primary to standby
    replicationMode: 'async',
    // Promote standby to primary on failover
    promotionTimeoutSeconds: 30,
  },

  // Redis replication
  redis: {
    // ElastiCache Global Datastore for cross-region replication
    replicationLagTargetMs: 100,
  },
};

/*
 * CDK Implementation (pseudocode):
 *
 * const healthCheck = new CfnHealthCheck(this, 'PrimaryHealthCheck', {
 *   healthCheckConfig: {
 *     type: 'HTTPS',
 *     fullyQualifiedDomainName: primaryAlbDns,
 *     resourcePath: '/health',
 *     requestInterval: FAILOVER_CONFIG.healthCheck.requestIntervalSeconds,
 *     failureThreshold: FAILOVER_CONFIG.healthCheck.failureThreshold,
 *   },
 * });
 *
 * // Primary record (FAILOVER routing policy)
 * new ARecord(this, 'PrimaryRecord', {
 *   zone: hostedZone,
 *   recordName: 'api.venueflow.io',
 *   target: RecordTarget.fromAlias(new LoadBalancerTarget(primaryAlb)),
 *   ttl: Duration.seconds(FAILOVER_CONFIG.ttlSeconds),
 *   setIdentifier: 'primary',
 *   failover: AliasRecordTargetConfig.PRIMARY,
 *   healthCheck,
 * });
 *
 * // Standby record
 * new ARecord(this, 'StandbyRecord', {
 *   zone: hostedZone,
 *   recordName: 'api.venueflow.io',
 *   target: RecordTarget.fromAlias(new LoadBalancerTarget(standbyAlb)),
 *   ttl: Duration.seconds(FAILOVER_CONFIG.ttlSeconds),
 *   setIdentifier: 'standby',
 *   failover: AliasRecordTargetConfig.SECONDARY,
 * });
 */
