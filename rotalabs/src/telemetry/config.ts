/**
 * Telemetry configuration management.
 */

/**
 * Configuration for telemetry reporting.
 */
export interface TelemetryConfig {
  // Required
  apiKey: string | null;

  // Connection
  baseUrl: string;
  timeout: number;

  // Feature flags
  enabled: boolean;
  sendContent: boolean;
  sendMetadata: boolean;

  // Batching
  batchSize: number;
  flushInterval: number;
  maxQueueSize: number;

  // Sampling
  sampleRate: number;

  // Filtering
  excludeModels: string[];

  // Package info (set automatically)
  packageName: string;
  packageVersion: string;

  // Custom metadata
  metadata: Record<string, unknown>;
}

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: TelemetryConfig = {
  apiKey: null,
  baseUrl: 'https://api.rotascale.com',
  timeout: 5000,
  enabled: false,
  sendContent: false,
  sendMetadata: true,
  batchSize: 100,
  flushInterval: 10000, // milliseconds
  maxQueueSize: 1000,
  sampleRate: 1.0,
  excludeModels: [],
  packageName: 'rotalabs',
  packageVersion: 'unknown',
  metadata: {},
};

// Global configuration instance
let _config: TelemetryConfig | null = null;

/**
 * Load configuration from environment variables.
 * Works in Node.js; in browser environments, returns defaults.
 */
function fromEnv(): Partial<TelemetryConfig> {
  // Check if we're in a Node.js environment
  if (typeof process !== 'undefined' && process.env) {
    return {
      apiKey: process.env.ROTASCALE_API_KEY || null,
      baseUrl: process.env.ROTASCALE_BASE_URL || DEFAULT_CONFIG.baseUrl,
      enabled: process.env.ROTASCALE_TELEMETRY_ENABLED?.toLowerCase() === 'true',
      sendContent: process.env.ROTASCALE_SEND_CONTENT?.toLowerCase() === 'true',
      sampleRate: process.env.ROTASCALE_SAMPLE_RATE
        ? parseFloat(process.env.ROTASCALE_SAMPLE_RATE)
        : DEFAULT_CONFIG.sampleRate,
    };
  }
  return {};
}

export interface ConfigureOptions {
  apiKey?: string | null;
  baseUrl?: string;
  enabled?: boolean;
  sendContent?: boolean;
  sendMetadata?: boolean;
  batchSize?: number;
  flushInterval?: number;
  maxQueueSize?: number;
  sampleRate?: number;
  excludeModels?: string[];
  packageName?: string;
  packageVersion?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Configure telemetry reporting.
 *
 * @param options - Configuration options
 * @throws Error if enabled is true but no API key is provided
 */
export function configure(options: ConfigureOptions = {}): void {
  // Load from environment first
  const envConfig = fromEnv();

  // Merge defaults, env, and options
  _config = {
    ...DEFAULT_CONFIG,
    ...envConfig,
    ...options,
    // Explicitly set enabled - defaults to true when configure() is called
    enabled: options.enabled !== undefined ? options.enabled : true,
  };

  // Validate
  if (_config.enabled && !_config.apiKey) {
    throw new Error(
      'API key required when telemetry is enabled. ' +
        'Pass apiKey or set ROTASCALE_API_KEY environment variable.'
    );
  }
}

/**
 * Disable telemetry reporting.
 */
export function disable(): void {
  if (_config !== null) {
    _config.enabled = false;
  } else {
    _config = { ...DEFAULT_CONFIG, enabled: false };
  }
}

/**
 * Check if telemetry is enabled.
 */
export function isEnabled(): boolean {
  if (_config === null) {
    return false;
  }
  return _config.enabled && _config.apiKey !== null;
}

/**
 * Get the current telemetry configuration.
 */
export function getConfig(): TelemetryConfig | null {
  return _config;
}

/**
 * Reset configuration to defaults (useful for testing).
 */
export function resetConfig(): void {
  _config = null;
}
