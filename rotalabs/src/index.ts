/**
 * @rotalabs/rotalabs - Core package for Rotalabs npm packages
 *
 * Provides shared utilities including telemetry for all rotalabs packages.
 */

export * as telemetry from './telemetry/index.js';

// Re-export commonly used types at top level for convenience
export type {
  TelemetryConfig,
  ConfigureOptions,
} from './telemetry/config.js';

export type {
  TelemetryEvent,
  EventType,
} from './telemetry/events.js';

export { EventTypes } from './telemetry/events.js';

// Package version
export const version = '0.1.0';
