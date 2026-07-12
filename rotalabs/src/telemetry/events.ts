/**
 * Telemetry event schemas and types.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * A telemetry event to be reported to the platform.
 */
export interface TelemetryEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  packageName: string;
  packageVersion: string;
  sdkVersion: string;
  data: Record<string, unknown>;
}

/**
 * Create a new telemetry event.
 */
export function createEvent(
  eventType: string,
  data: Record<string, unknown>,
  packageName: string,
  packageVersion: string,
  sdkVersion: string = '0.1.0'
): TelemetryEvent {
  return {
    eventId: uuidv4(),
    eventType,
    timestamp: new Date().toISOString(),
    packageName,
    packageVersion,
    sdkVersion,
    data,
  };
}

/**
 * Convert event to JSON-serializable object for API.
 */
export function eventToPayload(event: TelemetryEvent): Record<string, unknown> {
  return {
    event_id: event.eventId,
    event_type: event.eventType,
    timestamp: event.timestamp,
    package: event.packageName,
    package_version: event.packageVersion,
    sdk_version: event.sdkVersion,
    data: event.data,
  };
}

/**
 * Standard telemetry event types.
 */
export const EventTypes = {
  // Steer events
  STEER_VECTOR_LOADED: 'steer.vector.loaded',
  STEER_VECTOR_APPLIED: 'steer.vector.applied',
  STEER_VECTOR_CREATED: 'steer.vector.created',

  // Probe/Guardian events
  PROBE_SCAN_COMPLETED: 'probe.scan.completed',
  PROBE_SANDBAGGING_DETECTED: 'probe.sandbagging.detected',
  PROBE_AWARENESS_CHECKED: 'probe.awareness.checked',

  // Eval events
  EVAL_METRIC_COMPUTED: 'eval.metric.computed',
  EVAL_SUITE_RUN: 'eval.suite.run',

  // Cascade/Orchestrate events
  CASCADE_WORKFLOW_STARTED: 'cascade.workflow.started',
  CASCADE_WORKFLOW_COMPLETED: 'cascade.workflow.completed',
  CASCADE_STEP_EXECUTED: 'cascade.step.executed',

  // Comply/AgentOps events
  COMPLY_RULE_CHECKED: 'comply.rule.checked',
  COMPLY_VIOLATION_DETECTED: 'comply.violation.detected',

  // Audit events
  AUDIT_TRACE_RECORDED: 'audit.trace.recorded',

  // Accel events
  ACCEL_MODEL_PROFILED: 'accel.model.profiled',
  ACCEL_OPTIMIZATION_APPLIED: 'accel.optimization.applied',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
