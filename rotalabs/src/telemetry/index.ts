/**
 * Telemetry module for rotalabs packages.
 *
 * This module provides opt-in telemetry to report usage to the Rotascale platform.
 * Telemetry is DISABLED by default and must be explicitly enabled.
 *
 * @example
 * ```typescript
 * import { telemetry } from '@rotalabs/rotalabs';
 *
 * // Enable telemetry (opt-in)
 * telemetry.configure({
 *   apiKey: 'rsk_live_...',
 *   baseUrl: 'https://api.rotascale.com',
 *   enabled: true,
 * });
 *
 * // Report an event (non-blocking)
 * telemetry.reportEvent('steer.vector.applied', { vectorName: 'helpful' });
 * ```
 */

// Config exports
export {
  configure,
  disable,
  isEnabled,
  getConfig,
  resetConfig,
  type TelemetryConfig,
  type ConfigureOptions,
} from './config.js';

// Client exports
export {
  reportEvent,
  flush,
  shutdown,
  getQueueLength,
  clearQueue,
} from './client.js';

// Event exports
export {
  createEvent,
  eventToPayload,
  EventTypes,
  type TelemetryEvent,
  type EventType,
} from './events.js';
