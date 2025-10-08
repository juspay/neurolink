/**
 * Observability Configuration Types
 * These configs are passed from the parent application (e.g., Lighthouse)
 * to enable telemetry and observability features in Neurolink SDK
 */

/**
 * Langfuse observability configuration
 */
export interface LangfuseConfig {
  /** Whether Langfuse is enabled */
  enabled: boolean;
  /** Langfuse public key */
  publicKey: string;
  /**
   * Langfuse secret key
   * @sensitive
   * WARNING: This is a sensitive credential. Handle securely.
   * Do NOT log, expose, or share this key. Follow best practices for secret management.
   */
  secretKey: string;
  /** Langfuse base URL (default: https://cloud.langfuse.com) */
  baseUrl?: string;
  /** Environment name (e.g., dev, staging, prod) */
  environment?: string;
  /** Release/version identifier */
  release?: string;
}

/**
 * OpenTelemetry configuration
 */
export interface OpenTelemetryConfig {
  /** Whether OpenTelemetry is enabled */
  enabled: boolean;
  /** OTLP endpoint URL */
  endpoint?: string;
  /** Service name for traces */
  serviceName?: string;
  /** Service version */
  serviceVersion?: string;
}

/**
 * Complete observability configuration for Neurolink SDK
 */
export interface ObservabilityConfig {
  /** Langfuse configuration */
  langfuse?: LangfuseConfig;
  /** OpenTelemetry configuration */
  openTelemetry?: OpenTelemetryConfig;
}
