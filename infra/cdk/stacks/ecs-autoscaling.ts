/**
 * ECS Fargate Auto-Scaling Configuration
 * Validates: Requirements 8.3
 *
 * Scale out when CPU/memory > 80% of configured capacity.
 * Target tracking scaling policies per service.
 *
 * TODO: Deploy with `cdk deploy ECSAutoScalingStack`
 * Requires: AWS CDK v2, AWS credentials configured
 */

// Service scaling targets — CPU threshold 80%, memory threshold 80%
export const SERVICE_SCALING_CONFIG = {
  services: [
    { name: 'auth-service',           minCapacity: 2, maxCapacity: 20, cpuTarget: 80, memTarget: 80 },
    { name: 'entry-router',           minCapacity: 4, maxCapacity: 50, cpuTarget: 70, memTarget: 75 },
    { name: 'heatmap-engine',         minCapacity: 4, maxCapacity: 40, cpuTarget: 70, memTarget: 75 },
    { name: 'notification-service',   minCapacity: 4, maxCapacity: 40, cpuTarget: 75, memTarget: 80 },
    { name: 'wayfinding-engine',      minCapacity: 2, maxCapacity: 20, cpuTarget: 80, memTarget: 80 },
    { name: 'queue-predictor',        minCapacity: 2, maxCapacity: 20, cpuTarget: 75, memTarget: 80 },
    { name: 'emergency-coordinator',  minCapacity: 3, maxCapacity: 30, cpuTarget: 70, memTarget: 75 },
    { name: 'threat-detection',       minCapacity: 2, maxCapacity: 20, cpuTarget: 80, memTarget: 80 },
    { name: 'analytics-service',      minCapacity: 2, maxCapacity: 15, cpuTarget: 80, memTarget: 80 },
  ],

  // Scale-out cooldown: 60s (fast response to load spikes)
  scaleOutCooldownSeconds: 60,

  // Scale-in cooldown: 300s (avoid thrashing)
  scaleInCooldownSeconds: 300,
};

/*
 * CDK Implementation (pseudocode — requires full CDK stack context):
 *
 * for (const svc of SERVICE_SCALING_CONFIG.services) {
 *   const scalableTarget = new ScalableTarget(this, `${svc.name}ScalableTarget`, {
 *     serviceNamespace: ServiceNamespace.ECS,
 *     resourceId: `service/${cluster.clusterName}/${svc.name}`,
 *     scalableDimension: 'ecs:service:DesiredCount',
 *     minCapacity: svc.minCapacity,
 *     maxCapacity: svc.maxCapacity,
 *   });
 *
 *   scalableTarget.scaleToTrackMetric(`${svc.name}CPUScaling`, {
 *     targetValue: svc.cpuTarget,
 *     predefinedMetric: PredefinedMetric.ECS_SERVICE_AVERAGE_CPU_UTILIZATION,
 *     scaleOutCooldown: Duration.seconds(SERVICE_SCALING_CONFIG.scaleOutCooldownSeconds),
 *     scaleInCooldown: Duration.seconds(SERVICE_SCALING_CONFIG.scaleInCooldownSeconds),
 *   });
 * }
 */
