/**
 * Telemetry client for sending events to the platform.
 */

import { getConfig, isEnabled } from './config.js';
import { TelemetryEvent, createEvent, eventToPayload } from './events.js';

// Event queue for batching
const eventQueue: TelemetryEvent[] = [];

// Worker state
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isShuttingDown = false;
let isWorkerStarted = false;

/**
 * Check if this event should be sampled.
 */
function shouldSample(): boolean {
  const config = getConfig();
  if (config === null) {
    return false;
  }
  if (config.sampleRate >= 1.0) {
    return true;
  }
  return Math.random() < config.sampleRate;
}

// SDK version for telemetry requests
const SDK_VERSION = '0.1.0';

/**
 * Send a batch of events to the platform.
 */
async function sendBatch(events: TelemetryEvent[]): Promise<boolean> {
  const config = getConfig();
  if (config === null || events.length === 0) {
    return false;
  }

  const payload = {
    events: events.map(eventToPayload),
  };

  try {
    // Use fetch API (works in Node.js 18+ and browsers)
    const response = await fetch(`${config.baseUrl}/v1/telemetry/ingest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': `rotalabs-telemetry/${SDK_VERSION}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.timeout),
    });

    if (response.status === 429) {
      // Rate limited
      const retryAfter = response.headers.get('Retry-After') || '60';
      console.warn(`Telemetry rate limited, retry after ${retryAfter}s`);
      return false;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    // Silently fail - telemetry should never break the app
    if (process.env.NODE_ENV === 'development') {
      console.debug('Failed to send telemetry:', error);
    }
    return false;
  }
}

/**
 * Process the event queue - send batches as needed.
 */
async function processQueue(): Promise<void> {
  const config = getConfig();
  if (config === null || eventQueue.length === 0) {
    return;
  }

  // Take up to batchSize events
  const batch = eventQueue.splice(0, config.batchSize);

  if (batch.length > 0) {
    await sendBatch(batch);
  }
}

/**
 * Start the background flush timer.
 */
function startFlushTimer(): void {
  if (flushTimer !== null || isShuttingDown) {
    return;
  }

  const config = getConfig();
  if (config === null) {
    return;
  }

  flushTimer = setInterval(() => {
    processQueue().catch(() => {
      // Ignore errors in background flush
    });
  }, config.flushInterval);

  // Allow Node.js to exit even if timer is running
  if (typeof flushTimer === 'object' && 'unref' in flushTimer) {
    flushTimer.unref();
  }
}

/**
 * Ensure the worker is started.
 */
function ensureWorkerStarted(): void {
  if (isWorkerStarted) {
    return;
  }
  isWorkerStarted = true;
  startFlushTimer();

  // Register shutdown handler in Node.js
  if (typeof process !== 'undefined' && process.on) {
    process.on('beforeExit', () => {
      shutdown();
    });
  }
}

/**
 * Report a telemetry event (non-blocking).
 *
 * This function is safe to call even if telemetry is disabled.
 * Events are queued and sent in batches.
 *
 * @param eventType - The type of event (e.g., "steer.vector.applied")
 * @param data - Event data to include
 */
export function reportEvent(
  eventType: string,
  data: Record<string, unknown>
): void {
  if (!isEnabled()) {
    return;
  }

  if (!shouldSample()) {
    return;
  }

  const config = getConfig();
  if (config === null) {
    return;
  }

  // Check queue size
  if (eventQueue.length >= config.maxQueueSize) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Telemetry queue full, dropping event');
    }
    return;
  }

  // Create event
  const event = createEvent(
    eventType,
    data,
    config.packageName,
    config.packageVersion
  );

  // Add to queue
  eventQueue.push(event);

  // Start worker if needed
  ensureWorkerStarted();

  // If batch size reached, trigger immediate flush
  if (eventQueue.length >= config.batchSize) {
    processQueue().catch(() => {
      // Ignore errors
    });
  }
}

/**
 * Flush all pending events immediately.
 */
export async function flush(): Promise<void> {
  if (!isEnabled()) {
    return;
  }

  // Process all remaining events in batches
  while (eventQueue.length > 0) {
    await processQueue();
  }
}

/**
 * Shutdown the telemetry client, flushing remaining events.
 */
export async function shutdown(): Promise<void> {
  if (!isWorkerStarted) {
    return;
  }

  isShuttingDown = true;

  // Stop the timer
  if (flushTimer !== null) {
    clearInterval(flushTimer);
    flushTimer = null;
  }

  // Flush remaining events
  await flush();

  isWorkerStarted = false;
  isShuttingDown = false;
}

/**
 * Get the current queue length (useful for testing).
 */
export function getQueueLength(): number {
  return eventQueue.length;
}

/**
 * Clear the queue (useful for testing).
 */
export function clearQueue(): void {
  eventQueue.length = 0;
}
