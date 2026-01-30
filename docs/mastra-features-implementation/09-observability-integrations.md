# Observability Integrations Implementation Guide

**Feature**: Mastra-style Observability with Multi-Platform Exporter Support
**Status**: Implementation Guide
**Priority**: High
**Complexity**: High

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current NeuroLink Telemetry Analysis](#current-neurolink-telemetry-analysis)
3. [Base Exporter Interface Design](#base-exporter-interface-design)
4. [Span Types and Serialization](#span-types-and-serialization)
5. [Platform Integrations](#platform-integrations)
6. [OpenTelemetry Integration](#opentelemetry-integration)
7. [Sampling Strategies](#sampling-strategies)
8. [Token Usage Tracking](#token-usage-tracking)
9. [Implementation Plan](#implementation-plan)
10. [Migration Guide](#migration-guide)

---

## Executive Summary

This document provides a comprehensive implementation guide for adding Mastra-style observability integrations to NeuroLink. The goal is to create a unified exporter system that supports multiple observability platforms while maintaining backward compatibility with the existing OpenTelemetry and Langfuse integrations.

### Key Objectives

- **Unified Exporter Interface**: Abstract base class for all observability exporters
- **Multi-Platform Support**: Langfuse, LangSmith, Datadog, Sentry, Braintrust, Arize, PostHog, Laminar
- **OpenTelemetry Bridge**: Bidirectional context propagation with OTel
- **Flexible Sampling**: Multiple sampling strategies for production workloads
- **Token Usage Tracking**: Comprehensive cost and usage analytics

---

## Current NeuroLink Telemetry Analysis

### Existing Architecture

NeuroLink currently has a layered telemetry system with the following components:

#### 1. TelemetryService (`src/lib/telemetry/telemetryService.ts`)

The core telemetry service provides OpenTelemetry integration:

```typescript
// Current capabilities:
- NodeSDK initialization with auto-instrumentation
- Metrics: ai_requests_total, ai_request_duration_ms, ai_tokens_used_total
- Tracing: Per-provider span creation with error handling
- Health metrics: Memory, uptime, error rates, response times
- NO-OP behavior when disabled (zero overhead)
```

**Key Methods**:

- `traceAIRequest<T>()` - Wraps AI operations in spans
- `recordAIRequest()` - Records metrics for AI requests
- `recordMCPToolCall()` - Tracks MCP tool executions
- `recordCustomMetric()` - Custom metric recording

#### 2. Langfuse Integration (`src/lib/services/server/ai/observability/instrumentation.ts`)

Existing Langfuse integration via OpenTelemetry:

```typescript
// Current capabilities:
- LangfuseSpanProcessor for trace export
- ContextEnricher for user/session attribution
- AsyncLocalStorage for request-scoped context
- Integration with Vercel AI SDK experimental_telemetry
```

**Flow**:

```
Vercel AI SDK -> OpenTelemetry Spans -> LangfuseSpanProcessor -> Langfuse Platform
```

#### 3. TelemetryHandler Module (`src/lib/core/modules/TelemetryHandler.ts`)

Provider-specific telemetry handling:

```typescript
// Current capabilities:
- Analytics creation and tracking
- Evaluation generation
- Performance metrics recording
- Cost calculation
- Telemetry configuration for AI SDK
```

#### 4. Configuration Types (`src/lib/types/observability.ts`)

```typescript
export type LangfuseConfig = {
  enabled: boolean;
  publicKey: string;
  secretKey: string;
  baseUrl?: string;
  environment?: string;
  release?: string;
  userId?: string;
  sessionId?: string;
};

export type OpenTelemetryConfig = {
  enabled: boolean;
  endpoint?: string;
  serviceName?: string;
  serviceVersion?: string;
};

export type ObservabilityConfig = {
  langfuse?: LangfuseConfig;
  openTelemetry?: OpenTelemetryConfig;
};
```

### Current Limitations

1. **Single Platform Focus**: Only Langfuse is fully integrated
2. **No Abstraction Layer**: Direct coupling to Langfuse API
3. **Limited Span Types**: Basic span categories without AI-specific types
4. **No Sampling Control**: All-or-nothing tracing
5. **Missing Platforms**: No support for LangSmith, Datadog, Sentry, etc.

---

## Base Exporter Interface Design

### Abstract Exporter Class

```typescript
// src/lib/observability/exporters/baseExporter.ts

import type { SpanData, ExporterConfig, ExportResult } from "../types";

/**
 * Abstract base class for all observability exporters
 * Follows the Mastra pattern for unified telemetry export
 */
export abstract class BaseExporter {
  protected readonly name: string;
  protected readonly config: ExporterConfig;
  protected initialized: boolean = false;
  protected buffer: SpanData[] = [];
  protected readonly maxBufferSize: number;
  protected flushInterval: NodeJS.Timeout | null = null;

  constructor(name: string, config: ExporterConfig) {
    this.name = name;
    this.config = config;
    this.maxBufferSize = config.maxBufferSize ?? 100;
  }

  /**
   * Initialize the exporter connection
   */
  abstract initialize(): Promise<void>;

  /**
   * Export a single span
   */
  abstract exportSpan(span: SpanData): Promise<ExportResult>;

  /**
   * Export multiple spans in batch
   */
  abstract exportBatch(spans: SpanData[]): Promise<ExportResult>;

  /**
   * Flush all buffered spans
   */
  abstract flush(): Promise<void>;

  /**
   * Shutdown the exporter gracefully
   */
  abstract shutdown(): Promise<void>;

  /**
   * Check exporter health status
   */
  abstract healthCheck(): Promise<ExporterHealthStatus>;

  /**
   * Buffer a span for batch export
   */
  protected bufferSpan(span: SpanData): void {
    this.buffer.push(span);
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * Start automatic flush interval
   */
  protected startFlushInterval(intervalMs: number): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushInterval = setInterval(() => this.flush(), intervalMs);
  }

  /**
   * Get exporter name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Check if exporter is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Exporter health status
 */
export type ExporterHealthStatus = {
  healthy: boolean;
  name: string;
  latencyMs?: number;
  lastExportTime?: number;
  pendingSpans: number;
  errors?: string[];
};
```

### Exporter Configuration Types

```typescript
// src/lib/observability/types/exporterTypes.ts

/**
 * Base configuration for all exporters
 */
export type ExporterConfig = {
  /** Whether the exporter is enabled */
  enabled: boolean;
  /** Maximum spans to buffer before auto-flush */
  maxBufferSize?: number;
  /** Flush interval in milliseconds */
  flushIntervalMs?: number;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
  /** Number of retry attempts */
  retries?: number;
  /** Custom headers for HTTP requests */
  headers?: Record<string, string>;
  /** Environment name (dev, staging, prod) */
  environment?: string;
  /** Service/application version */
  version?: string;
};

/**
 * Export result with status and metadata
 */
export type ExportResult = {
  success: boolean;
  exportedCount: number;
  failedCount: number;
  errors?: ExportError[];
  durationMs: number;
};

/**
 * Export error details
 */
export type ExportError = {
  spanId: string;
  error: string;
  retryable: boolean;
};
```

### Exporter Registry

```typescript
// src/lib/observability/exporterRegistry.ts

import type { BaseExporter } from "./exporters/baseExporter";
import type { SpanData } from "./types";

/**
 * Registry for managing multiple exporters
 */
export class ExporterRegistry {
  private exporters: Map<string, BaseExporter> = new Map();
  private defaultExporter: string | null = null;

  /**
   * Register an exporter
   */
  register(exporter: BaseExporter): void {
    this.exporters.set(exporter.getName(), exporter);
  }

  /**
   * Unregister an exporter
   */
  unregister(name: string): boolean {
    return this.exporters.delete(name);
  }

  /**
   * Get an exporter by name
   */
  get(name: string): BaseExporter | undefined {
    return this.exporters.get(name);
  }

  /**
   * Set the default exporter
   */
  setDefault(name: string): void {
    if (!this.exporters.has(name)) {
      throw new Error(`Exporter '${name}' not registered`);
    }
    this.defaultExporter = name;
  }

  /**
   * Export span to all registered exporters
   */
  async exportToAll(span: SpanData): Promise<Map<string, ExportResult>> {
    const results = new Map<string, ExportResult>();

    for (const [name, exporter] of this.exporters) {
      if (exporter.isInitialized()) {
        try {
          const result = await exporter.exportSpan(span);
          results.set(name, result);
        } catch (error) {
          results.set(name, {
            success: false,
            exportedCount: 0,
            failedCount: 1,
            errors: [
              {
                spanId: span.spanId,
                error: error instanceof Error ? error.message : String(error),
                retryable: true,
              },
            ],
            durationMs: 0,
          });
        }
      }
    }

    return results;
  }

  /**
   * Initialize all exporters
   */
  async initializeAll(): Promise<void> {
    await Promise.all(
      Array.from(this.exporters.values()).map((e) => e.initialize()),
    );
  }

  /**
   * Shutdown all exporters
   */
  async shutdownAll(): Promise<void> {
    await Promise.all(
      Array.from(this.exporters.values()).map((e) => e.shutdown()),
    );
  }

  /**
   * Flush all exporters
   */
  async flushAll(): Promise<void> {
    await Promise.all(
      Array.from(this.exporters.values()).map((e) => e.flush()),
    );
  }

  /**
   * Get health status of all exporters
   */
  async healthCheckAll(): Promise<Map<string, ExporterHealthStatus>> {
    const results = new Map<string, ExporterHealthStatus>();

    for (const [name, exporter] of this.exporters) {
      results.set(name, await exporter.healthCheck());
    }

    return results;
  }
}
```

---

## Span Types and Serialization

### AI-Specific Span Types

```typescript
// src/lib/observability/types/spanTypes.ts

/**
 * Span types for AI operations
 * Following Mastra's span categorization
 */
export enum SpanType {
  /** Agent execution run */
  AGENT_RUN = "agent.run",
  /** Workflow step execution */
  WORKFLOW_STEP = "workflow.step",
  /** Tool/function call */
  TOOL_CALL = "tool.call",
  /** LLM generation request */
  MODEL_GENERATION = "model.generation",
  /** Embedding generation */
  EMBEDDING = "embedding",
  /** Retrieval operation */
  RETRIEVAL = "retrieval",
  /** Memory operation */
  MEMORY = "memory",
  /** Custom span */
  CUSTOM = "custom",
}

/**
 * Span status codes
 */
export enum SpanStatus {
  UNSET = 0,
  OK = 1,
  ERROR = 2,
}

/**
 * Base span data structure
 */
export type SpanData = {
  /** Unique span identifier */
  spanId: string;
  /** Trace identifier for distributed tracing */
  traceId: string;
  /** Parent span ID for nested operations */
  parentSpanId?: string;
  /** Span type category */
  type: SpanType;
  /** Human-readable span name */
  name: string;
  /** Start timestamp (ISO 8601) */
  startTime: string;
  /** End timestamp (ISO 8601) */
  endTime?: string;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Span status */
  status: SpanStatus;
  /** Status message (for errors) */
  statusMessage?: string;
  /** Span attributes/tags */
  attributes: SpanAttributes;
  /** Events within the span */
  events: SpanEvent[];
  /** Links to related spans */
  links: SpanLink[];
};

/**
 * Span attributes with AI-specific fields
 */
export type SpanAttributes = {
  // Standard attributes
  "service.name"?: string;
  "service.version"?: string;
  "deployment.environment"?: string;

  // User context
  "user.id"?: string;
  "session.id"?: string;

  // AI provider attributes
  "ai.provider"?: string;
  "ai.model"?: string;
  "ai.model.version"?: string;

  // Token usage
  "ai.tokens.input"?: number;
  "ai.tokens.output"?: number;
  "ai.tokens.total"?: number;
  "ai.tokens.cache_read"?: number;
  "ai.tokens.cache_creation"?: number;
  "ai.tokens.reasoning"?: number;

  // Cost tracking
  "ai.cost.input"?: number;
  "ai.cost.output"?: number;
  "ai.cost.total"?: number;
  "ai.cost.currency"?: string;

  // Generation parameters
  "ai.temperature"?: number;
  "ai.max_tokens"?: number;
  "ai.top_p"?: number;
  "ai.stop_sequences"?: string[];

  // Tool attributes
  "tool.name"?: string;
  "tool.server"?: string;
  "tool.success"?: boolean;

  // Error attributes
  "error.type"?: string;
  "error.message"?: string;
  "error.stack"?: string;

  // Custom attributes
  [key: string]: unknown;
};

/**
 * Span event for recording discrete occurrences
 */
export type SpanEvent = {
  name: string;
  timestamp: string;
  attributes?: Record<string, unknown>;
};

/**
 * Link to related span
 */
export type SpanLink = {
  traceId: string;
  spanId: string;
  attributes?: Record<string, unknown>;
};
```

### Span Serialization Utilities

```typescript
// src/lib/observability/utils/spanSerializer.ts

import type { SpanData, SpanAttributes } from "../types/spanTypes";
import { nanoid } from "nanoid";

/**
 * Utility class for span creation and serialization
 */
export class SpanSerializer {
  /**
   * Create a new span with generated IDs
   */
  static createSpan(
    type: SpanType,
    name: string,
    attributes: Partial<SpanAttributes> = {},
    parentSpanId?: string,
    traceId?: string,
  ): SpanData {
    return {
      spanId: nanoid(16),
      traceId: traceId ?? nanoid(32),
      parentSpanId,
      type,
      name,
      startTime: new Date().toISOString(),
      status: SpanStatus.UNSET,
      attributes: attributes as SpanAttributes,
      events: [],
      links: [],
    };
  }

  /**
   * End a span with status
   */
  static endSpan(
    span: SpanData,
    status: SpanStatus = SpanStatus.OK,
    statusMessage?: string,
  ): SpanData {
    const endTime = new Date();
    const startTime = new Date(span.startTime);

    return {
      ...span,
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
      status,
      statusMessage,
    };
  }

  /**
   * Add event to span
   */
  static addEvent(
    span: SpanData,
    name: string,
    attributes?: Record<string, unknown>,
  ): SpanData {
    return {
      ...span,
      events: [
        ...span.events,
        {
          name,
          timestamp: new Date().toISOString(),
          attributes,
        },
      ],
    };
  }

  /**
   * Serialize span to JSON for export
   */
  static toJSON(span: SpanData): string {
    return JSON.stringify(span, null, 2);
  }

  /**
   * Serialize span for Langfuse format
   */
  static toLangfuseFormat(span: SpanData): LangfuseSpan {
    return {
      id: span.spanId,
      traceId: span.traceId,
      parentObservationId: span.parentSpanId,
      name: span.name,
      startTime: span.startTime,
      endTime: span.endTime,
      metadata: span.attributes,
      level: span.status === SpanStatus.ERROR ? "ERROR" : "DEFAULT",
      statusMessage: span.statusMessage,
      input: span.attributes["input"],
      output: span.attributes["output"],
      usage: span.attributes["ai.tokens.total"]
        ? {
            promptTokens: span.attributes["ai.tokens.input"] as number,
            completionTokens: span.attributes["ai.tokens.output"] as number,
            totalTokens: span.attributes["ai.tokens.total"] as number,
          }
        : undefined,
    };
  }

  /**
   * Serialize span for LangSmith format
   */
  static toLangSmithFormat(span: SpanData): LangSmithRun {
    return {
      id: span.spanId,
      trace_id: span.traceId,
      parent_run_id: span.parentSpanId,
      name: span.name,
      run_type: mapSpanTypeToLangSmithRunType(span.type),
      start_time: span.startTime,
      end_time: span.endTime,
      extra: span.attributes,
      error: span.status === SpanStatus.ERROR ? span.statusMessage : undefined,
      inputs: span.attributes["input"],
      outputs: span.attributes["output"],
      tags: extractTags(span.attributes),
    };
  }

  /**
   * Serialize span for OpenTelemetry format
   */
  static toOtelFormat(span: SpanData): OtelSpan {
    return {
      traceId: hexToBase64(span.traceId),
      spanId: hexToBase64(span.spanId),
      parentSpanId: span.parentSpanId
        ? hexToBase64(span.parentSpanId)
        : undefined,
      name: span.name,
      kind: 1, // SPAN_KIND_INTERNAL
      startTimeUnixNano: new Date(span.startTime).getTime() * 1_000_000,
      endTimeUnixNano: span.endTime
        ? new Date(span.endTime).getTime() * 1_000_000
        : undefined,
      attributes: Object.entries(span.attributes).map(([key, value]) => ({
        key,
        value: { stringValue: String(value) },
      })),
      status: {
        code: span.status,
        message: span.statusMessage,
      },
      events: span.events.map((e) => ({
        name: e.name,
        timeUnixNano: new Date(e.timestamp).getTime() * 1_000_000,
        attributes: e.attributes
          ? Object.entries(e.attributes).map(([k, v]) => ({
              key: k,
              value: { stringValue: String(v) },
            }))
          : [],
      })),
    };
  }
}

// Helper functions
function mapSpanTypeToLangSmithRunType(type: SpanType): string {
  const mapping: Record<SpanType, string> = {
    [SpanType.AGENT_RUN]: "chain",
    [SpanType.WORKFLOW_STEP]: "chain",
    [SpanType.TOOL_CALL]: "tool",
    [SpanType.MODEL_GENERATION]: "llm",
    [SpanType.EMBEDDING]: "embedding",
    [SpanType.RETRIEVAL]: "retriever",
    [SpanType.MEMORY]: "chain",
    [SpanType.CUSTOM]: "chain",
  };
  return mapping[type] || "chain";
}

function extractTags(attributes: SpanAttributes): string[] {
  const tags: string[] = [];
  if (attributes["ai.provider"])
    tags.push(`provider:${attributes["ai.provider"]}`);
  if (attributes["ai.model"]) tags.push(`model:${attributes["ai.model"]}`);
  if (attributes["deployment.environment"])
    tags.push(`env:${attributes["deployment.environment"]}`);
  return tags;
}

function hexToBase64(hex: string): string {
  return Buffer.from(hex, "hex").toString("base64");
}
```

---

## Platform Integrations

### 1. Langfuse Exporter (Enhanced)

```typescript
// src/lib/observability/exporters/langfuseExporter.ts

import { BaseExporter, type ExporterHealthStatus } from "./baseExporter";
import type { SpanData, ExportResult, ExporterConfig } from "../types";
import { SpanSerializer } from "../utils/spanSerializer";
import { Langfuse } from "langfuse";

export type LangfuseExporterConfig = ExporterConfig & {
  publicKey: string;
  secretKey: string;
  baseUrl?: string;
  release?: string;
};

export class LangfuseExporter extends BaseExporter {
  private client: Langfuse | null = null;
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly release?: string;

  constructor(config: LangfuseExporterConfig) {
    super("langfuse", config);
    this.publicKey = config.publicKey;
    this.secretKey = config.secretKey;
    this.baseUrl = config.baseUrl ?? "https://cloud.langfuse.com";
    this.release = config.release;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.client = new Langfuse({
      publicKey: this.publicKey,
      secretKey: this.secretKey,
      baseUrl: this.baseUrl,
      release: this.release,
    });

    this.initialized = true;
    this.startFlushInterval(this.config.flushIntervalMs ?? 5000);
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    const startTime = Date.now();

    if (!this.client) {
      return {
        success: false,
        exportedCount: 0,
        failedCount: 1,
        errors: [
          {
            spanId: span.spanId,
            error: "Client not initialized",
            retryable: true,
          },
        ],
        durationMs: Date.now() - startTime,
      };
    }

    try {
      const langfuseSpan = SpanSerializer.toLangfuseFormat(span);

      // Create trace if this is a root span
      if (!span.parentSpanId) {
        this.client.trace({
          id: span.traceId,
          name: span.name,
          userId: span.attributes["user.id"] as string,
          sessionId: span.attributes["session.id"] as string,
          metadata: span.attributes,
        });
      }

      // Create span/generation based on type
      if (span.type === SpanType.MODEL_GENERATION) {
        this.client.generation({
          traceId: span.traceId,
          ...langfuseSpan,
        });
      } else {
        this.client.span({
          traceId: span.traceId,
          ...langfuseSpan,
        });
      }

      return {
        success: true,
        exportedCount: 1,
        failedCount: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        exportedCount: 0,
        failedCount: 1,
        errors: [
          {
            spanId: span.spanId,
            error: error instanceof Error ? error.message : String(error),
            retryable: true,
          },
        ],
        durationMs: Date.now() - startTime,
      };
    }
  }

  async exportBatch(spans: SpanData[]): Promise<ExportResult> {
    const results = await Promise.all(spans.map((s) => this.exportSpan(s)));

    return {
      success: results.every((r) => r.success),
      exportedCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      errors: results.flatMap((r) => r.errors ?? []),
      durationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
    };
  }

  async flush(): Promise<void> {
    if (this.client && this.buffer.length > 0) {
      await this.exportBatch([...this.buffer]);
      this.buffer = [];
      await this.client.flushAsync();
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.client?.shutdownAsync();
    this.initialized = false;
  }

  async healthCheck(): Promise<ExporterHealthStatus> {
    return {
      healthy: this.initialized && this.client !== null,
      name: this.name,
      pendingSpans: this.buffer.length,
      lastExportTime: Date.now(),
    };
  }
}
```

### 2. LangSmith Exporter

```typescript
// src/lib/observability/exporters/langsmithExporter.ts

import { BaseExporter, type ExporterHealthStatus } from "./baseExporter";
import type { SpanData, ExportResult, ExporterConfig } from "../types";
import { SpanSerializer } from "../utils/spanSerializer";

export type LangSmithExporterConfig = ExporterConfig & {
  apiKey: string;
  projectName?: string;
  endpoint?: string;
};

export class LangSmithExporter extends BaseExporter {
  private readonly apiKey: string;
  private readonly projectName: string;
  private readonly endpoint: string;

  constructor(config: LangSmithExporterConfig) {
    super("langsmith", config);
    this.apiKey = config.apiKey;
    this.projectName = config.projectName ?? "default";
    this.endpoint = config.endpoint ?? "https://api.smith.langchain.com";
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Verify API key with a test request
    const response = await fetch(`${this.endpoint}/api/v1/info`, {
      headers: { "x-api-key": this.apiKey },
    });

    if (!response.ok) {
      throw new Error(
        `LangSmith initialization failed: ${response.statusText}`,
      );
    }

    this.initialized = true;
    this.startFlushInterval(this.config.flushIntervalMs ?? 5000);
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      const langsmithRun = SpanSerializer.toLangSmithFormat(span);

      const response = await fetch(`${this.endpoint}/api/v1/runs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          ...langsmithRun,
          session_name: this.projectName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return {
        success: true,
        exportedCount: 1,
        failedCount: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        exportedCount: 0,
        failedCount: 1,
        errors: [
          {
            spanId: span.spanId,
            error: error instanceof Error ? error.message : String(error),
            retryable: true,
          },
        ],
        durationMs: Date.now() - startTime,
      };
    }
  }

  async exportBatch(spans: SpanData[]): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      const runs = spans.map((s) => ({
        ...SpanSerializer.toLangSmithFormat(s),
        session_name: this.projectName,
      }));

      const response = await fetch(`${this.endpoint}/api/v1/runs/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({ runs }),
      });

      if (!response.ok) {
        throw new Error(`Batch export failed: ${response.statusText}`);
      }

      return {
        success: true,
        exportedCount: spans.length,
        failedCount: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        exportedCount: 0,
        failedCount: spans.length,
        errors: spans.map((s) => ({
          spanId: s.spanId,
          error: error instanceof Error ? error.message : String(error),
          retryable: true,
        })),
        durationMs: Date.now() - startTime,
      };
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length > 0) {
      await this.exportBatch([...this.buffer]);
      this.buffer = [];
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.initialized = false;
  }

  async healthCheck(): Promise<ExporterHealthStatus> {
    try {
      const response = await fetch(`${this.endpoint}/api/v1/info`, {
        headers: { "x-api-key": this.apiKey },
      });

      return {
        healthy: response.ok,
        name: this.name,
        pendingSpans: this.buffer.length,
      };
    } catch {
      return {
        healthy: false,
        name: this.name,
        pendingSpans: this.buffer.length,
        errors: ["Health check failed"],
      };
    }
  }
}
```

### 3. Datadog Exporter

```typescript
// src/lib/observability/exporters/datadogExporter.ts

import { BaseExporter, type ExporterHealthStatus } from "./baseExporter";
import type { SpanData, ExportResult, ExporterConfig } from "../types";

export type DatadogExporterConfig = ExporterConfig & {
  apiKey: string;
  appKey?: string;
  site?: string; // us1, us3, us5, eu1, ap1
  service?: string;
  source?: string;
};

export class DatadogExporter extends BaseExporter {
  private readonly apiKey: string;
  private readonly appKey?: string;
  private readonly site: string;
  private readonly service: string;
  private readonly source: string;
  private readonly logsEndpoint: string;
  private readonly tracesEndpoint: string;

  constructor(config: DatadogExporterConfig) {
    super("datadog", config);
    this.apiKey = config.apiKey;
    this.appKey = config.appKey;
    this.site = config.site ?? "us1";
    this.service = config.service ?? "neurolink";
    this.source = config.source ?? "neurolink-ai";

    const baseDomain =
      this.site === "us1" ? "datadoghq.com" : `${this.site}.datadoghq.com`;
    this.logsEndpoint = `https://http-intake.logs.${baseDomain}/api/v2/logs`;
    this.tracesEndpoint = `https://trace.agent.${baseDomain}/api/v0.2/traces`;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Validate API key
    const response = await fetch("https://api.datadoghq.com/api/v1/validate", {
      headers: {
        "DD-API-KEY": this.apiKey,
        ...(this.appKey && { "DD-APPLICATION-KEY": this.appKey }),
      },
    });

    if (!response.ok) {
      throw new Error(
        `Datadog API key validation failed: ${response.statusText}`,
      );
    }

    this.initialized = true;
    this.startFlushInterval(this.config.flushIntervalMs ?? 10000);
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      // Convert to Datadog log format with trace correlation
      const log = this.convertToDatadogLog(span);

      const response = await fetch(this.logsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "DD-API-KEY": this.apiKey,
        },
        body: JSON.stringify([log]),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return {
        success: true,
        exportedCount: 1,
        failedCount: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        exportedCount: 0,
        failedCount: 1,
        errors: [
          {
            spanId: span.spanId,
            error: error instanceof Error ? error.message : String(error),
            retryable: true,
          },
        ],
        durationMs: Date.now() - startTime,
      };
    }
  }

  private convertToDatadogLog(span: SpanData): Record<string, unknown> {
    return {
      ddsource: this.source,
      ddtags: this.buildTags(span),
      hostname: process.env.HOSTNAME || "unknown",
      message: `${span.type}: ${span.name}`,
      service: this.service,
      status: span.status === SpanStatus.ERROR ? "error" : "info",
      timestamp: new Date(span.startTime).getTime(),
      // Trace correlation
      dd: {
        trace_id: span.traceId,
        span_id: span.spanId,
      },
      // AI-specific attributes
      ai: {
        provider: span.attributes["ai.provider"],
        model: span.attributes["ai.model"],
        tokens: {
          input: span.attributes["ai.tokens.input"],
          output: span.attributes["ai.tokens.output"],
          total: span.attributes["ai.tokens.total"],
        },
        cost: span.attributes["ai.cost.total"],
        duration_ms: span.durationMs,
      },
      // User context
      usr: {
        id: span.attributes["user.id"],
        session_id: span.attributes["session.id"],
      },
    };
  }

  private buildTags(span: SpanData): string {
    const tags: string[] = [
      `env:${this.config.environment ?? "production"}`,
      `version:${this.config.version ?? "unknown"}`,
      `span_type:${span.type}`,
    ];

    if (span.attributes["ai.provider"]) {
      tags.push(`ai_provider:${span.attributes["ai.provider"]}`);
    }
    if (span.attributes["ai.model"]) {
      tags.push(`ai_model:${span.attributes["ai.model"]}`);
    }

    return tags.join(",");
  }

  async exportBatch(spans: SpanData[]): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      const logs = spans.map((s) => this.convertToDatadogLog(s));

      const response = await fetch(this.logsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "DD-API-KEY": this.apiKey,
        },
        body: JSON.stringify(logs),
      });

      if (!response.ok) {
        throw new Error(`Batch export failed: ${response.statusText}`);
      }

      return {
        success: true,
        exportedCount: spans.length,
        failedCount: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        exportedCount: 0,
        failedCount: spans.length,
        errors: spans.map((s) => ({
          spanId: s.spanId,
          error: error instanceof Error ? error.message : String(error),
          retryable: true,
        })),
        durationMs: Date.now() - startTime,
      };
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length > 0) {
      await this.exportBatch([...this.buffer]);
      this.buffer = [];
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.initialized = false;
  }

  async healthCheck(): Promise<ExporterHealthStatus> {
    try {
      const response = await fetch(
        "https://api.datadoghq.com/api/v1/validate",
        {
          headers: { "DD-API-KEY": this.apiKey },
        },
      );

      return {
        healthy: response.ok,
        name: this.name,
        pendingSpans: this.buffer.length,
      };
    } catch {
      return {
        healthy: false,
        name: this.name,
        pendingSpans: this.buffer.length,
        errors: ["Health check failed"],
      };
    }
  }
}
```

### 4. Sentry Exporter

```typescript
// src/lib/observability/exporters/sentryExporter.ts

import { BaseExporter, type ExporterHealthStatus } from "./baseExporter";
import type { SpanData, ExportResult, ExporterConfig } from "../types";
import * as Sentry from "@sentry/node";

export type SentryExporterConfig = ExporterConfig & {
  dsn: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  release?: string;
};

export class SentryExporter extends BaseExporter {
  private readonly dsn: string;
  private readonly tracesSampleRate: number;
  private readonly release?: string;

  constructor(config: SentryExporterConfig) {
    super("sentry", config);
    this.dsn = config.dsn;
    this.tracesSampleRate = config.tracesSampleRate ?? 1.0;
    this.release = config.release;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    Sentry.init({
      dsn: this.dsn,
      tracesSampleRate: this.tracesSampleRate,
      release: this.release,
      environment: this.config.environment ?? "production",
      integrations: [
        // Add AI-specific integration
        Sentry.extraErrorDataIntegration(),
      ],
    });

    this.initialized = true;
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      // For errors, capture as Sentry exception
      if (span.status === SpanStatus.ERROR) {
        Sentry.withScope((scope) => {
          scope.setTags({
            "ai.provider": span.attributes["ai.provider"] as string,
            "ai.model": span.attributes["ai.model"] as string,
            "span.type": span.type,
          });
          scope.setContext("ai", {
            tokens: {
              input: span.attributes["ai.tokens.input"],
              output: span.attributes["ai.tokens.output"],
              total: span.attributes["ai.tokens.total"],
            },
            cost: span.attributes["ai.cost.total"],
            duration_ms: span.durationMs,
          });
          scope.setUser({
            id: span.attributes["user.id"] as string,
            session_id: span.attributes["session.id"] as string,
          });

          Sentry.captureException(
            new Error(span.statusMessage ?? "AI operation failed"),
          );
        });
      }

      // Create Sentry transaction for all spans
      const transaction = Sentry.startTransaction({
        name: span.name,
        op: span.type,
        traceId: span.traceId,
        spanId: span.spanId,
        parentSpanId: span.parentSpanId,
        startTimestamp: new Date(span.startTime).getTime() / 1000,
      });

      // Set transaction data
      transaction.setData("ai.provider", span.attributes["ai.provider"]);
      transaction.setData("ai.model", span.attributes["ai.model"]);
      transaction.setData(
        "ai.tokens.total",
        span.attributes["ai.tokens.total"],
      );
      transaction.setData("ai.cost.total", span.attributes["ai.cost.total"]);

      // Finish transaction
      if (span.endTime) {
        transaction.finish(new Date(span.endTime).getTime() / 1000);
      } else {
        transaction.finish();
      }

      return {
        success: true,
        exportedCount: 1,
        failedCount: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        exportedCount: 0,
        failedCount: 1,
        errors: [
          {
            spanId: span.spanId,
            error: error instanceof Error ? error.message : String(error),
            retryable: false,
          },
        ],
        durationMs: Date.now() - startTime,
      };
    }
  }

  async exportBatch(spans: SpanData[]): Promise<ExportResult> {
    const results = await Promise.all(spans.map((s) => this.exportSpan(s)));

    return {
      success: results.every((r) => r.success),
      exportedCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      errors: results.flatMap((r) => r.errors ?? []),
      durationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
    };
  }

  async flush(): Promise<void> {
    if (this.buffer.length > 0) {
      await this.exportBatch([...this.buffer]);
      this.buffer = [];
    }
    await Sentry.flush(2000);
  }

  async shutdown(): Promise<void> {
    await this.flush();
    await Sentry.close(2000);
    this.initialized = false;
  }

  async healthCheck(): Promise<ExporterHealthStatus> {
    return {
      healthy: this.initialized,
      name: this.name,
      pendingSpans: this.buffer.length,
    };
  }
}
```

### 5. Braintrust Exporter

```typescript
// src/lib/observability/exporters/braintrustExporter.ts

import { BaseExporter, type ExporterHealthStatus } from "./baseExporter";
import type { SpanData, ExportResult, ExporterConfig } from "../types";

export type BraintrustExporterConfig = ExporterConfig & {
  apiKey: string;
  projectName: string;
  endpoint?: string;
};

export class BraintrustExporter extends BaseExporter {
  private readonly apiKey: string;
  private readonly projectName: string;
  private readonly endpoint: string;

  constructor(config: BraintrustExporterConfig) {
    super("braintrust", config);
    this.apiKey = config.apiKey;
    this.projectName = config.projectName;
    this.endpoint = config.endpoint ?? "https://api.braintrust.dev";
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Verify API key
    const response = await fetch(`${this.endpoint}/v1/project`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      throw new Error(
        `Braintrust initialization failed: ${response.statusText}`,
      );
    }

    this.initialized = true;
    this.startFlushInterval(this.config.flushIntervalMs ?? 5000);
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      // Convert to Braintrust log format
      const log = {
        project_name: this.projectName,
        id: span.spanId,
        span_id: span.spanId,
        root_span_id: span.parentSpanId ? undefined : span.spanId,
        span_parents: span.parentSpanId ? [span.parentSpanId] : [],
        input: span.attributes["input"],
        output: span.attributes["output"],
        expected: span.attributes["expected"],
        scores: span.attributes["scores"],
        metadata: {
          provider: span.attributes["ai.provider"],
          model: span.attributes["ai.model"],
          type: span.type,
          ...span.attributes,
        },
        metrics: {
          tokens: span.attributes["ai.tokens.total"],
          cost: span.attributes["ai.cost.total"],
          duration_ms: span.durationMs,
        },
        created: span.startTime,
      };

      const response = await fetch(
        `${this.endpoint}/v1/project_logs/${this.projectName}/insert`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({ events: [log] }),
        },
      );

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return {
        success: true,
        exportedCount: 1,
        failedCount: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        exportedCount: 0,
        failedCount: 1,
        errors: [
          {
            spanId: span.spanId,
            error: error instanceof Error ? error.message : String(error),
            retryable: true,
          },
        ],
        durationMs: Date.now() - startTime,
      };
    }
  }

  async exportBatch(spans: SpanData[]): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      const events = spans.map((span) => ({
        project_name: this.projectName,
        id: span.spanId,
        span_id: span.spanId,
        root_span_id: span.parentSpanId ? undefined : span.spanId,
        span_parents: span.parentSpanId ? [span.parentSpanId] : [],
        input: span.attributes["input"],
        output: span.attributes["output"],
        metadata: {
          provider: span.attributes["ai.provider"],
          model: span.attributes["ai.model"],
          type: span.type,
          ...span.attributes,
        },
        metrics: {
          tokens: span.attributes["ai.tokens.total"],
          cost: span.attributes["ai.cost.total"],
          duration_ms: span.durationMs,
        },
        created: span.startTime,
      }));

      const response = await fetch(
        `${this.endpoint}/v1/project_logs/${this.projectName}/insert`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({ events }),
        },
      );

      if (!response.ok) {
        throw new Error(`Batch export failed: ${response.statusText}`);
      }

      return {
        success: true,
        exportedCount: spans.length,
        failedCount: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        exportedCount: 0,
        failedCount: spans.length,
        errors: spans.map((s) => ({
          spanId: s.spanId,
          error: error instanceof Error ? error.message : String(error),
          retryable: true,
        })),
        durationMs: Date.now() - startTime,
      };
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length > 0) {
      await this.exportBatch([...this.buffer]);
      this.buffer = [];
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.initialized = false;
  }

  async healthCheck(): Promise<ExporterHealthStatus> {
    try {
      const response = await fetch(`${this.endpoint}/v1/project`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      return {
        healthy: response.ok,
        name: this.name,
        pendingSpans: this.buffer.length,
      };
    } catch {
      return {
        healthy: false,
        name: this.name,
        pendingSpans: this.buffer.length,
        errors: ["Health check failed"],
      };
    }
  }
}
```

### 6. Arize Exporter

```typescript
// src/lib/observability/exporters/arizeExporter.ts

import { BaseExporter, type ExporterHealthStatus } from "./baseExporter";
import type { SpanData, ExportResult, ExporterConfig } from "../types";

export type ArizeExporterConfig = ExporterConfig & {
  spaceKey: string;
  apiKey: string;
  modelId?: string;
  modelVersion?: string;
};

export class ArizeExporter extends BaseExporter {
  private readonly spaceKey: string;
  private readonly apiKey: string;
  private readonly modelId: string;
  private readonly modelVersion: string;
  private readonly endpoint = "https://api.arize.com/v1";

  constructor(config: ArizeExporterConfig) {
    super("arize", config);
    this.spaceKey = config.spaceKey;
    this.apiKey = config.apiKey;
    this.modelId = config.modelId ?? "neurolink-ai";
    this.modelVersion = config.modelVersion ?? "1.0.0";
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    this.startFlushInterval(this.config.flushIntervalMs ?? 10000);
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      // Convert to Arize prediction log format
      const prediction = {
        space_key: this.spaceKey,
        model_id: span.attributes["ai.model"] ?? this.modelId,
        model_version: this.modelVersion,
        prediction_id: span.spanId,
        prediction_timestamp: new Date(span.startTime).getTime(),
        features: {
          provider: span.attributes["ai.provider"],
          temperature: span.attributes["ai.temperature"],
          max_tokens: span.attributes["ai.max_tokens"],
          user_id: span.attributes["user.id"],
          session_id: span.attributes["session.id"],
        },
        prediction: {
          input: span.attributes["input"],
          output: span.attributes["output"],
        },
        tags: {
          span_type: span.type,
          environment: this.config.environment,
        },
        latency_ms: span.durationMs,
        token_count: {
          prompt: span.attributes["ai.tokens.input"],
          completion: span.attributes["ai.tokens.output"],
          total: span.attributes["ai.tokens.total"],
        },
      };

      const response = await fetch(`${this.endpoint}/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "space-key": this.spaceKey,
        },
        body: JSON.stringify(prediction),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return {
        success: true,
        exportedCount: 1,
        failedCount: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        exportedCount: 0,
        failedCount: 1,
        errors: [
          {
            spanId: span.spanId,
            error: error instanceof Error ? error.message : String(error),
            retryable: true,
          },
        ],
        durationMs: Date.now() - startTime,
      };
    }
  }

  async exportBatch(spans: SpanData[]): Promise<ExportResult> {
    // Arize supports batch logging
    const results = await Promise.all(spans.map((s) => this.exportSpan(s)));

    return {
      success: results.every((r) => r.success),
      exportedCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      errors: results.flatMap((r) => r.errors ?? []),
      durationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
    };
  }

  async flush(): Promise<void> {
    if (this.buffer.length > 0) {
      await this.exportBatch([...this.buffer]);
      this.buffer = [];
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.initialized = false;
  }

  async healthCheck(): Promise<ExporterHealthStatus> {
    return {
      healthy: this.initialized,
      name: this.name,
      pendingSpans: this.buffer.length,
    };
  }
}
```

### 7. PostHog Exporter

```typescript
// src/lib/observability/exporters/posthogExporter.ts

import { BaseExporter, type ExporterHealthStatus } from "./baseExporter";
import type { SpanData, ExportResult, ExporterConfig } from "../types";
import { PostHog } from "posthog-node";

export type PostHogExporterConfig = ExporterConfig & {
  apiKey: string;
  host?: string;
  personalApiKey?: string;
};

export class PostHogExporter extends BaseExporter {
  private client: PostHog | null = null;
  private readonly apiKey: string;
  private readonly host: string;

  constructor(config: PostHogExporterConfig) {
    super("posthog", config);
    this.apiKey = config.apiKey;
    this.host = config.host ?? "https://app.posthog.com";
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.client = new PostHog(this.apiKey, {
      host: this.host,
      flushAt: this.config.maxBufferSize ?? 20,
      flushInterval: this.config.flushIntervalMs ?? 10000,
    });

    this.initialized = true;
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    const startTime = Date.now();

    if (!this.client) {
      return {
        success: false,
        exportedCount: 0,
        failedCount: 1,
        errors: [
          {
            spanId: span.spanId,
            error: "Client not initialized",
            retryable: true,
          },
        ],
        durationMs: Date.now() - startTime,
      };
    }

    try {
      const distinctId = (span.attributes["user.id"] as string) ?? "anonymous";

      // Capture as PostHog event
      this.client.capture({
        distinctId,
        event: `ai_${span.type.replace(".", "_")}`,
        properties: {
          $session_id: span.attributes["session.id"],
          span_id: span.spanId,
          trace_id: span.traceId,
          parent_span_id: span.parentSpanId,
          span_name: span.name,
          // AI properties
          ai_provider: span.attributes["ai.provider"],
          ai_model: span.attributes["ai.model"],
          ai_tokens_input: span.attributes["ai.tokens.input"],
          ai_tokens_output: span.attributes["ai.tokens.output"],
          ai_tokens_total: span.attributes["ai.tokens.total"],
          ai_cost_total: span.attributes["ai.cost.total"],
          // Performance
          duration_ms: span.durationMs,
          status: span.status === SpanStatus.ERROR ? "error" : "success",
          error_message: span.statusMessage,
          // Environment
          environment: this.config.environment,
          version: this.config.version,
        },
        timestamp: new Date(span.startTime),
      });

      return {
        success: true,
        exportedCount: 1,
        failedCount: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        exportedCount: 0,
        failedCount: 1,
        errors: [
          {
            spanId: span.spanId,
            error: error instanceof Error ? error.message : String(error),
            retryable: true,
          },
        ],
        durationMs: Date.now() - startTime,
      };
    }
  }

  async exportBatch(spans: SpanData[]): Promise<ExportResult> {
    const results = await Promise.all(spans.map((s) => this.exportSpan(s)));

    return {
      success: results.every((r) => r.success),
      exportedCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      errors: results.flatMap((r) => r.errors ?? []),
      durationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
    };
  }

  async flush(): Promise<void> {
    if (this.buffer.length > 0) {
      await this.exportBatch([...this.buffer]);
      this.buffer = [];
    }
    await this.client?.flush();
  }

  async shutdown(): Promise<void> {
    await this.flush();
    await this.client?.shutdown();
    this.initialized = false;
  }

  async healthCheck(): Promise<ExporterHealthStatus> {
    return {
      healthy: this.initialized && this.client !== null,
      name: this.name,
      pendingSpans: this.buffer.length,
    };
  }
}
```

### 8. Laminar Exporter

```typescript
// src/lib/observability/exporters/laminarExporter.ts

import { BaseExporter, type ExporterHealthStatus } from "./baseExporter";
import type { SpanData, ExportResult, ExporterConfig } from "../types";

export type LaminarExporterConfig = ExporterConfig & {
  apiKey: string;
  projectApiKey?: string;
  baseUrl?: string;
};

export class LaminarExporter extends BaseExporter {
  private readonly apiKey: string;
  private readonly projectApiKey?: string;
  private readonly baseUrl: string;

  constructor(config: LaminarExporterConfig) {
    super("laminar", config);
    this.apiKey = config.apiKey;
    this.projectApiKey = config.projectApiKey;
    this.baseUrl = config.baseUrl ?? "https://api.lmnr.ai";
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    this.startFlushInterval(this.config.flushIntervalMs ?? 5000);
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      const laminarSpan = {
        span_id: span.spanId,
        trace_id: span.traceId,
        parent_span_id: span.parentSpanId,
        name: span.name,
        start_time: span.startTime,
        end_time: span.endTime,
        attributes: {
          "lmnr.span.type": this.mapSpanTypeToLaminar(span.type),
          ...span.attributes,
        },
        events: span.events.map((e) => ({
          name: e.name,
          timestamp: e.timestamp,
          attributes: e.attributes,
        })),
        status: {
          status_code: span.status === SpanStatus.ERROR ? "ERROR" : "OK",
          message: span.statusMessage,
        },
        // LLM-specific data
        input: span.attributes["input"],
        output: span.attributes["output"],
        model: span.attributes["ai.model"],
        provider: span.attributes["ai.provider"],
        usage: {
          prompt_tokens: span.attributes["ai.tokens.input"],
          completion_tokens: span.attributes["ai.tokens.output"],
          total_tokens: span.attributes["ai.tokens.total"],
        },
        cost: span.attributes["ai.cost.total"],
      };

      const response = await fetch(`${this.baseUrl}/v1/traces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          ...(this.projectApiKey && {
            "x-project-api-key": this.projectApiKey,
          }),
        },
        body: JSON.stringify({ spans: [laminarSpan] }),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return {
        success: true,
        exportedCount: 1,
        failedCount: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        exportedCount: 0,
        failedCount: 1,
        errors: [
          {
            spanId: span.spanId,
            error: error instanceof Error ? error.message : String(error),
            retryable: true,
          },
        ],
        durationMs: Date.now() - startTime,
      };
    }
  }

  private mapSpanTypeToLaminar(type: SpanType): string {
    const mapping: Record<SpanType, string> = {
      [SpanType.AGENT_RUN]: "AGENT",
      [SpanType.WORKFLOW_STEP]: "PIPELINE",
      [SpanType.TOOL_CALL]: "TOOL",
      [SpanType.MODEL_GENERATION]: "LLM",
      [SpanType.EMBEDDING]: "EMBEDDING",
      [SpanType.RETRIEVAL]: "RETRIEVER",
      [SpanType.MEMORY]: "DEFAULT",
      [SpanType.CUSTOM]: "DEFAULT",
    };
    return mapping[type] || "DEFAULT";
  }

  async exportBatch(spans: SpanData[]): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      const laminarSpans = spans.map((span) => ({
        span_id: span.spanId,
        trace_id: span.traceId,
        parent_span_id: span.parentSpanId,
        name: span.name,
        start_time: span.startTime,
        end_time: span.endTime,
        attributes: {
          "lmnr.span.type": this.mapSpanTypeToLaminar(span.type),
          ...span.attributes,
        },
        events: span.events,
        status: {
          status_code: span.status === SpanStatus.ERROR ? "ERROR" : "OK",
          message: span.statusMessage,
        },
        input: span.attributes["input"],
        output: span.attributes["output"],
        model: span.attributes["ai.model"],
        provider: span.attributes["ai.provider"],
        usage: {
          prompt_tokens: span.attributes["ai.tokens.input"],
          completion_tokens: span.attributes["ai.tokens.output"],
          total_tokens: span.attributes["ai.tokens.total"],
        },
        cost: span.attributes["ai.cost.total"],
      }));

      const response = await fetch(`${this.baseUrl}/v1/traces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          ...(this.projectApiKey && {
            "x-project-api-key": this.projectApiKey,
          }),
        },
        body: JSON.stringify({ spans: laminarSpans }),
      });

      if (!response.ok) {
        throw new Error(`Batch export failed: ${response.statusText}`);
      }

      return {
        success: true,
        exportedCount: spans.length,
        failedCount: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        exportedCount: 0,
        failedCount: spans.length,
        errors: spans.map((s) => ({
          spanId: s.spanId,
          error: error instanceof Error ? error.message : String(error),
          retryable: true,
        })),
        durationMs: Date.now() - startTime,
      };
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length > 0) {
      await this.exportBatch([...this.buffer]);
      this.buffer = [];
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.initialized = false;
  }

  async healthCheck(): Promise<ExporterHealthStatus> {
    return {
      healthy: this.initialized,
      name: this.name,
      pendingSpans: this.buffer.length,
    };
  }
}
```

---

## OpenTelemetry Integration

### OTel Exporter

```typescript
// src/lib/observability/exporters/otelExporter.ts

import { BaseExporter, type ExporterHealthStatus } from "./baseExporter";
import type { SpanData, ExportResult, ExporterConfig } from "../types";
import { SpanSerializer } from "../utils/spanSerializer";

export type OtelProtocol = "http" | "grpc" | "zipkin";

export type OtelExporterConfig = ExporterConfig & {
  endpoint: string;
  protocol?: OtelProtocol;
  serviceName?: string;
  serviceVersion?: string;
  resourceAttributes?: Record<string, string>;
  compression?: "gzip" | "none";
};

export class OtelExporter extends BaseExporter {
  private readonly endpoint: string;
  private readonly protocol: OtelProtocol;
  private readonly serviceName: string;
  private readonly serviceVersion: string;
  private readonly resourceAttributes: Record<string, string>;
  private readonly compression: "gzip" | "none";

  constructor(config: OtelExporterConfig) {
    super("opentelemetry", config);
    this.endpoint = config.endpoint;
    this.protocol = config.protocol ?? "http";
    this.serviceName = config.serviceName ?? "neurolink-ai";
    this.serviceVersion = config.serviceVersion ?? "1.0.0";
    this.resourceAttributes = config.resourceAttributes ?? {};
    this.compression = config.compression ?? "none";
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    this.startFlushInterval(this.config.flushIntervalMs ?? 5000);
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    this.bufferSpan(span);
    return {
      success: true,
      exportedCount: 0, // Buffered, not exported yet
      failedCount: 0,
      durationMs: 0,
    };
  }

  async exportBatch(spans: SpanData[]): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      const otelSpans = spans.map((s) => SpanSerializer.toOtelFormat(s));

      const payload = {
        resourceSpans: [
          {
            resource: {
              attributes: [
                {
                  key: "service.name",
                  value: { stringValue: this.serviceName },
                },
                {
                  key: "service.version",
                  value: { stringValue: this.serviceVersion },
                },
                ...Object.entries(this.resourceAttributes).map(
                  ([key, value]) => ({
                    key,
                    value: { stringValue: value },
                  }),
                ),
              ],
            },
            scopeSpans: [
              {
                scope: {
                  name: "neurolink-observability",
                  version: "1.0.0",
                },
                spans: otelSpans,
              },
            ],
          },
        ],
      };

      const url = this.getExportUrl();
      const headers = this.getHeaders();

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`OTLP export failed: ${response.statusText}`);
      }

      return {
        success: true,
        exportedCount: spans.length,
        failedCount: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        exportedCount: 0,
        failedCount: spans.length,
        errors: spans.map((s) => ({
          spanId: s.spanId,
          error: error instanceof Error ? error.message : String(error),
          retryable: true,
        })),
        durationMs: Date.now() - startTime,
      };
    }
  }

  private getExportUrl(): string {
    switch (this.protocol) {
      case "http":
        return `${this.endpoint}/v1/traces`;
      case "zipkin":
        return `${this.endpoint}/api/v2/spans`;
      case "grpc":
        // For gRPC, this would use @grpc/grpc-js
        return this.endpoint;
      default:
        return `${this.endpoint}/v1/traces`;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type":
        this.protocol === "zipkin" ? "application/json" : "application/json",
    };

    if (this.compression === "gzip") {
      headers["Content-Encoding"] = "gzip";
    }

    // Add any custom headers from config
    if (this.config.headers) {
      Object.assign(headers, this.config.headers);
    }

    return headers;
  }

  async flush(): Promise<void> {
    if (this.buffer.length > 0) {
      await this.exportBatch([...this.buffer]);
      this.buffer = [];
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.initialized = false;
  }

  async healthCheck(): Promise<ExporterHealthStatus> {
    try {
      // Simple connectivity check
      const response = await fetch(this.endpoint, { method: "HEAD" });
      return {
        healthy: response.ok || response.status === 405, // 405 is OK for HEAD
        name: this.name,
        pendingSpans: this.buffer.length,
      };
    } catch {
      return {
        healthy: false,
        name: this.name,
        pendingSpans: this.buffer.length,
        errors: ["Endpoint unreachable"],
      };
    }
  }
}
```

### OTel Bridge (Bidirectional Context Propagation)

```typescript
// src/lib/observability/otelBridge.ts

import { trace, context, propagation, SpanContext } from "@opentelemetry/api";
import type { SpanData } from "./types/spanTypes";
import { SpanSerializer } from "./utils/spanSerializer";
import { SpanType, SpanStatus } from "./types/spanTypes";

/**
 * Bridge for bidirectional context propagation between
 * NeuroLink's observability system and OpenTelemetry
 */
export class OtelBridge {
  private readonly tracer = trace.getTracer("neurolink-bridge");

  /**
   * Extract trace context from incoming request headers
   */
  extractContext(headers: Record<string, string>): SpanContext | null {
    const extractedContext = propagation.extract(context.active(), headers);
    const spanContext = trace.getSpanContext(extractedContext);
    return spanContext ?? null;
  }

  /**
   * Inject trace context into outgoing request headers
   */
  injectContext(headers: Record<string, string>): Record<string, string> {
    propagation.inject(context.active(), headers);
    return headers;
  }

  /**
   * Create a NeuroLink span from OpenTelemetry context
   */
  createSpanFromOtelContext(
    spanContext: SpanContext,
    type: SpanType,
    name: string,
  ): SpanData {
    return SpanSerializer.createSpan(
      type,
      name,
      {},
      undefined,
      spanContext.traceId,
    );
  }

  /**
   * Wrap a function with OpenTelemetry tracing that also creates NeuroLink spans
   */
  async wrapWithTracing<T>(
    name: string,
    type: SpanType,
    fn: (span: SpanData) => Promise<T>,
    onSpanEnd?: (span: SpanData) => void,
  ): Promise<T> {
    const otelSpan = this.tracer.startSpan(name);
    const neuroLinkSpan = SpanSerializer.createSpan(
      type,
      name,
      {},
      undefined,
      otelSpan.spanContext().traceId,
    );

    try {
      const result = await context.with(
        trace.setSpan(context.active(), otelSpan),
        () => fn(neuroLinkSpan),
      );

      const endedSpan = SpanSerializer.endSpan(neuroLinkSpan, SpanStatus.OK);
      otelSpan.setStatus({ code: 1 }); // OK

      if (onSpanEnd) {
        onSpanEnd(endedSpan);
      }

      return result;
    } catch (error) {
      const endedSpan = SpanSerializer.endSpan(
        neuroLinkSpan,
        SpanStatus.ERROR,
        error instanceof Error ? error.message : String(error),
      );

      otelSpan.setStatus({
        code: 2, // ERROR
        message: error instanceof Error ? error.message : String(error),
      });
      otelSpan.recordException(error as Error);

      if (onSpanEnd) {
        onSpanEnd(endedSpan);
      }

      throw error;
    } finally {
      otelSpan.end();
    }
  }

  /**
   * Convert NeuroLink span to OpenTelemetry span and export
   */
  exportToOtel(span: SpanData): void {
    const otelSpan = this.tracer.startSpan(span.name, {
      startTime: new Date(span.startTime),
      attributes: span.attributes as Record<string, string | number | boolean>,
    });

    // Add events
    for (const event of span.events) {
      otelSpan.addEvent(
        event.name,
        event.attributes,
        new Date(event.timestamp),
      );
    }

    // Set status
    otelSpan.setStatus({
      code: span.status,
      message: span.statusMessage,
    });

    // End span
    if (span.endTime) {
      otelSpan.end(new Date(span.endTime));
    } else {
      otelSpan.end();
    }
  }

  /**
   * Get current trace context for correlation
   */
  getCurrentTraceContext(): { traceId: string; spanId: string } | null {
    const spanContext = trace.getActiveSpan()?.spanContext();
    if (!spanContext) return null;

    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }
}
```

---

## Sampling Strategies

```typescript
// src/lib/observability/sampling/samplers.ts

import type { SpanData } from "../types/spanTypes";

/**
 * Sampler type for controlling which spans are exported
 */
export type Sampler = {
  /** Sampler name for identification */
  name: string;

  /** Determine if a span should be sampled */
  shouldSample(span: SpanData): boolean;

  /** Get sampling decision description */
  getDescription(): string;
};

/**
 * Always sample all spans
 */
export class AlwaysSampler implements Sampler {
  name = "always";

  shouldSample(_span: SpanData): boolean {
    return true;
  }

  getDescription(): string {
    return "Samples 100% of spans";
  }
}

/**
 * Never sample any spans
 */
export class NeverSampler implements Sampler {
  name = "never";

  shouldSample(_span: SpanData): boolean {
    return false;
  }

  getDescription(): string {
    return "Samples 0% of spans";
  }
}

/**
 * Sample spans based on a probability ratio
 */
export class RatioSampler implements Sampler {
  name = "ratio";
  private readonly ratio: number;

  constructor(ratio: number) {
    if (ratio < 0 || ratio > 1) {
      throw new Error("Ratio must be between 0 and 1");
    }
    this.ratio = ratio;
  }

  shouldSample(_span: SpanData): boolean {
    return Math.random() < this.ratio;
  }

  getDescription(): string {
    return `Samples ${this.ratio * 100}% of spans`;
  }
}

/**
 * Sample based on trace ID for consistent sampling across a trace
 */
export class TraceIdRatioSampler implements Sampler {
  name = "trace-id-ratio";
  private readonly ratio: number;
  private readonly upperBound: number;

  constructor(ratio: number) {
    if (ratio < 0 || ratio > 1) {
      throw new Error("Ratio must be between 0 and 1");
    }
    this.ratio = ratio;
    this.upperBound = Math.floor(ratio * 0xffffffff);
  }

  shouldSample(span: SpanData): boolean {
    // Use first 8 chars of trace ID as hash
    const hash = parseInt(span.traceId.substring(0, 8), 16);
    return hash < this.upperBound;
  }

  getDescription(): string {
    return `Samples ${this.ratio * 100}% of traces (consistent per trace)`;
  }
}

/**
 * Sample based on span attributes (e.g., errors, specific providers)
 */
export class AttributeBasedSampler implements Sampler {
  name = "attribute-based";
  private readonly rules: SamplingRule[];
  private readonly defaultSampler: Sampler;

  constructor(
    rules: SamplingRule[],
    defaultSampler: Sampler = new RatioSampler(0.1),
  ) {
    this.rules = rules;
    this.defaultSampler = defaultSampler;
  }

  shouldSample(span: SpanData): boolean {
    for (const rule of this.rules) {
      if (this.matchesRule(span, rule)) {
        return rule.sample;
      }
    }
    return this.defaultSampler.shouldSample(span);
  }

  private matchesRule(span: SpanData, rule: SamplingRule): boolean {
    for (const [key, value] of Object.entries(rule.conditions)) {
      const spanValue = span.attributes[key];
      if (spanValue !== value) {
        return false;
      }
    }
    return true;
  }

  getDescription(): string {
    return `Attribute-based sampling with ${this.rules.length} rules`;
  }
}

/**
 * Sampling rule definition
 */
export type SamplingRule = {
  /** Rule name for identification */
  name: string;
  /** Conditions that must match (AND logic) */
  conditions: Record<string, unknown>;
  /** Whether to sample if conditions match */
  sample: boolean;
  /** Optional priority (higher = evaluated first) */
  priority?: number;
};

/**
 * Composite sampler that combines multiple samplers
 */
export class CompositeSampler implements Sampler {
  name = "composite";
  private readonly samplers: Array<{ sampler: Sampler; weight: number }>;
  private readonly totalWeight: number;

  constructor(samplers: Array<{ sampler: Sampler; weight: number }>) {
    this.samplers = samplers;
    this.totalWeight = samplers.reduce((sum, s) => sum + s.weight, 0);
  }

  shouldSample(span: SpanData): boolean {
    let random = Math.random() * this.totalWeight;

    for (const { sampler, weight } of this.samplers) {
      random -= weight;
      if (random <= 0) {
        return sampler.shouldSample(span);
      }
    }

    return this.samplers[this.samplers.length - 1].sampler.shouldSample(span);
  }

  getDescription(): string {
    return `Composite of ${this.samplers.length} samplers`;
  }
}

/**
 * Custom sampler that uses a user-provided function
 */
export class CustomSampler implements Sampler {
  name = "custom";
  private readonly sampleFn: (span: SpanData) => boolean;
  private readonly description: string;

  constructor(
    sampleFn: (span: SpanData) => boolean,
    description: string = "Custom sampling function",
  ) {
    this.sampleFn = sampleFn;
    this.description = description;
  }

  shouldSample(span: SpanData): boolean {
    return this.sampleFn(span);
  }

  getDescription(): string {
    return this.description;
  }
}

/**
 * Factory for creating samplers from configuration
 */
export class SamplerFactory {
  static create(config: SamplerConfig): Sampler {
    switch (config.type) {
      case "always":
        return new AlwaysSampler();
      case "never":
        return new NeverSampler();
      case "ratio":
        return new RatioSampler(config.ratio ?? 0.1);
      case "trace-id-ratio":
        return new TraceIdRatioSampler(config.ratio ?? 0.1);
      case "attribute-based":
        return new AttributeBasedSampler(
          config.rules ?? [],
          config.defaultRatio
            ? new RatioSampler(config.defaultRatio)
            : undefined,
        );
      default:
        return new RatioSampler(0.1);
    }
  }
}

/**
 * Sampler configuration
 */
export type SamplerConfig = {
  type:
    | "always"
    | "never"
    | "ratio"
    | "trace-id-ratio"
    | "attribute-based"
    | "custom";
  ratio?: number;
  rules?: SamplingRule[];
  defaultRatio?: number;
};
```

---

## Token Usage Tracking

```typescript
// src/lib/observability/tokenTracker.ts

import type { SpanData, SpanAttributes } from "./types/spanTypes";
import { modelConfig } from "../core/modelConfiguration";

/**
 * Token usage aggregation and tracking
 */
export type TokenUsageStats = {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  reasoningTokens: number;
  totalCost: number;
  byProvider: Map<string, ProviderTokenStats>;
  byModel: Map<string, ModelTokenStats>;
  bySpanType: Map<string, number>;
};

export type ProviderTokenStats = {
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  requestCount: number;
};

export type ModelTokenStats = {
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  requestCount: number;
  avgTokensPerRequest: number;
};

/**
 * Token tracker for aggregating usage across spans
 */
export class TokenTracker {
  private stats: TokenUsageStats = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    reasoningTokens: 0,
    totalCost: 0,
    byProvider: new Map(),
    byModel: new Map(),
    bySpanType: new Map(),
  };

  /**
   * Track token usage from a span
   */
  trackSpan(span: SpanData): void {
    const attrs = span.attributes;

    const inputTokens = (attrs["ai.tokens.input"] as number) ?? 0;
    const outputTokens = (attrs["ai.tokens.output"] as number) ?? 0;
    const totalTokens =
      (attrs["ai.tokens.total"] as number) ?? inputTokens + outputTokens;
    const cacheRead = (attrs["ai.tokens.cache_read"] as number) ?? 0;
    const cacheCreation = (attrs["ai.tokens.cache_creation"] as number) ?? 0;
    const reasoning = (attrs["ai.tokens.reasoning"] as number) ?? 0;
    const cost =
      (attrs["ai.cost.total"] as number) ??
      this.calculateCost(attrs, inputTokens, outputTokens);

    // Update totals
    this.stats.totalInputTokens += inputTokens;
    this.stats.totalOutputTokens += outputTokens;
    this.stats.totalTokens += totalTokens;
    this.stats.cacheReadTokens += cacheRead;
    this.stats.cacheCreationTokens += cacheCreation;
    this.stats.reasoningTokens += reasoning;
    this.stats.totalCost += cost;

    // Update by provider
    const provider = attrs["ai.provider"] as string;
    if (provider) {
      const providerStats = this.stats.byProvider.get(provider) ?? {
        provider,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        requestCount: 0,
      };
      providerStats.inputTokens += inputTokens;
      providerStats.outputTokens += outputTokens;
      providerStats.totalTokens += totalTokens;
      providerStats.cost += cost;
      providerStats.requestCount += 1;
      this.stats.byProvider.set(provider, providerStats);
    }

    // Update by model
    const model = attrs["ai.model"] as string;
    if (model) {
      const modelStats = this.stats.byModel.get(model) ?? {
        model,
        provider: provider ?? "unknown",
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        requestCount: 0,
        avgTokensPerRequest: 0,
      };
      modelStats.inputTokens += inputTokens;
      modelStats.outputTokens += outputTokens;
      modelStats.totalTokens += totalTokens;
      modelStats.cost += cost;
      modelStats.requestCount += 1;
      modelStats.avgTokensPerRequest =
        modelStats.totalTokens / modelStats.requestCount;
      this.stats.byModel.set(model, modelStats);
    }

    // Update by span type
    const currentTypeTotal = this.stats.bySpanType.get(span.type) ?? 0;
    this.stats.bySpanType.set(span.type, currentTypeTotal + totalTokens);
  }

  /**
   * Calculate cost from token counts and provider/model
   */
  private calculateCost(
    attrs: SpanAttributes,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const provider = attrs["ai.provider"] as string;
    const model = attrs["ai.model"] as string;

    if (!provider || !model) return 0;

    try {
      const costInfo = modelConfig.getCostInfo(provider.toLowerCase(), model);
      if (!costInfo) return 0;

      const inputCost = (inputTokens / 1000) * costInfo.input;
      const outputCost = (outputTokens / 1000) * costInfo.output;
      return inputCost + outputCost;
    } catch {
      return 0;
    }
  }

  /**
   * Get current stats
   */
  getStats(): TokenUsageStats {
    return { ...this.stats };
  }

  /**
   * Get stats for a specific time window
   */
  getStatsForWindow(spans: SpanData[]): TokenUsageStats {
    const tracker = new TokenTracker();
    for (const span of spans) {
      tracker.trackSpan(span);
    }
    return tracker.getStats();
  }

  /**
   * Reset all stats
   */
  reset(): void {
    this.stats = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      reasoningTokens: 0,
      totalCost: 0,
      byProvider: new Map(),
      byModel: new Map(),
      bySpanType: new Map(),
    };
  }

  /**
   * Export stats as JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      ...this.stats,
      byProvider: Object.fromEntries(this.stats.byProvider),
      byModel: Object.fromEntries(this.stats.byModel),
      bySpanType: Object.fromEntries(this.stats.bySpanType),
    };
  }
}

/**
 * Enrich span with token usage attributes
 */
export function enrichSpanWithTokenUsage(
  span: SpanData,
  usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
    reasoningTokens?: number;
  },
): SpanData {
  return {
    ...span,
    attributes: {
      ...span.attributes,
      "ai.tokens.input": usage.promptTokens ?? 0,
      "ai.tokens.output": usage.completionTokens ?? 0,
      "ai.tokens.total":
        usage.totalTokens ??
        (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0),
      "ai.tokens.cache_creation": usage.cacheCreationTokens,
      "ai.tokens.cache_read": usage.cacheReadTokens,
      "ai.tokens.reasoning": usage.reasoningTokens,
    },
  };
}
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)

1. **Create observability module structure**

   ```
   src/lib/observability/
   ├── types/
   │   ├── spanTypes.ts
   │   └── exporterTypes.ts
   ├── exporters/
   │   └── baseExporter.ts
   ├── utils/
   │   └── spanSerializer.ts
   ├── sampling/
   │   └── samplers.ts
   ├── exporterRegistry.ts
   ├── tokenTracker.ts
   ├── otelBridge.ts
   └── index.ts
   ```

2. **Implement base types and interfaces**
   - SpanData, SpanType, SpanStatus
   - ExporterConfig, ExportResult
   - Sampler interface

3. **Implement BaseExporter abstract class**
   - Buffering logic
   - Flush interval management
   - Health check interface

### Phase 2: Platform Exporters (Week 3-4)

1. **Implement primary exporters**
   - LangfuseExporter (enhance existing)
   - LangSmithExporter
   - DatadogExporter

2. **Implement secondary exporters**
   - SentryExporter
   - BraintrustExporter
   - ArizeExporter
   - PostHogExporter
   - LaminarExporter

3. **Implement OtelExporter**
   - HTTP protocol
   - gRPC protocol
   - Zipkin protocol

### Phase 3: Integration (Week 5-6)

1. **Implement ExporterRegistry**
   - Multi-exporter support
   - Export to all registered exporters

2. **Implement OtelBridge**
   - Context propagation
   - Bidirectional span conversion

3. **Implement sampling strategies**
   - All sampler types
   - SamplerFactory

4. **Implement TokenTracker**
   - Usage aggregation
   - Cost calculation

### Phase 4: Integration with NeuroLink Core (Week 7-8)

1. **Update ObservabilityConfig type**

   ```typescript
   export type ObservabilityConfig = {
     langfuse?: LangfuseExporterConfig;
     langsmith?: LangSmithExporterConfig;
     datadog?: DatadogExporterConfig;
     sentry?: SentryExporterConfig;
     braintrust?: BraintrustExporterConfig;
     arize?: ArizeExporterConfig;
     posthog?: PostHogExporterConfig;
     laminar?: LaminarExporterConfig;
     openTelemetry?: OtelExporterConfig;
     sampling?: SamplerConfig;
   };
   ```

2. **Update NeuroLink constructor**
   - Initialize exporters from config
   - Register with ExporterRegistry

3. **Update TelemetryHandler**
   - Create SpanData from AI operations
   - Export via registry

4. **Add observability middleware**
   - Auto-span creation for generate/stream
   - Tool call span creation

### Phase 5: Testing and Documentation (Week 9-10)

1. **Unit tests for all exporters**
2. **Integration tests with mock servers**
3. **Documentation and examples**
4. **Performance benchmarking**

---

## Migration Guide

### From Current Langfuse-Only Setup

```typescript
// Before: Current setup
const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: "pk-xxx",
      secretKey: "sk-xxx",
    },
  },
});

// After: Multi-exporter setup (backward compatible)
const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: "pk-xxx",
      secretKey: "sk-xxx",
    },
    // Add additional exporters
    datadog: {
      enabled: true,
      apiKey: "dd-xxx",
    },
    sampling: {
      type: "ratio",
      ratio: 0.1,
    },
  },
});
```

### Environment Variables

```bash
# Langfuse (existing)
LANGFUSE_ENABLED=true
LANGFUSE_PUBLIC_KEY=pk-xxx
LANGFUSE_SECRET_KEY=sk-xxx

# LangSmith (new)
LANGSMITH_API_KEY=ls-xxx
LANGSMITH_PROJECT=my-project

# Datadog (new)
DATADOG_API_KEY=dd-xxx
DATADOG_SITE=us1

# Sentry (new)
SENTRY_DSN=https://xxx@sentry.io/xxx

# Braintrust (new)
BRAINTRUST_API_KEY=bt-xxx
BRAINTRUST_PROJECT=my-project

# Arize (new)
ARIZE_SPACE_KEY=xxx
ARIZE_API_KEY=xxx

# PostHog (new)
POSTHOG_API_KEY=phc_xxx

# Laminar (new)
LAMINAR_API_KEY=lm-xxx

# OpenTelemetry (new)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http

# Sampling (new)
NEUROLINK_SAMPLING_TYPE=ratio
NEUROLINK_SAMPLING_RATIO=0.1
```

### Code Examples

#### Basic Multi-Platform Setup

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  observability: {
    // LLM-specific observability
    langfuse: {
      enabled: true,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
    },
    // Enterprise APM
    datadog: {
      enabled: true,
      apiKey: process.env.DATADOG_API_KEY!,
      service: "my-ai-service",
    },
    // Error tracking
    sentry: {
      enabled: true,
      dsn: process.env.SENTRY_DSN!,
    },
    // Sample 10% of traces in production
    sampling: {
      type: "ratio",
      ratio: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    },
  },
});
```

#### Attribute-Based Sampling

```typescript
const neurolink = new NeuroLink({
  observability: {
    langfuse: { enabled: true, ... },
    sampling: {
      type: 'attribute-based',
      rules: [
        // Always sample errors
        { name: 'errors', conditions: { 'error': true }, sample: true, priority: 100 },
        // Always sample expensive models
        { name: 'expensive', conditions: { 'ai.model': 'gpt-4o' }, sample: true, priority: 90 },
        // Sample 50% of tool calls
        { name: 'tools', conditions: { 'tool.name': '*' }, sample: true, priority: 50 }
      ],
      defaultRatio: 0.1
    }
  }
});
```

#### Manual Span Creation

```typescript
import {
  SpanSerializer,
  SpanType,
  SpanStatus,
} from "@juspay/neurolink/observability";

// Create a span for custom operations
const span = SpanSerializer.createSpan(SpanType.CUSTOM, "process-document", {
  "document.type": "pdf",
  "document.pages": 10,
});

try {
  // Do work...
  const result = await processDocument();

  // End span successfully
  const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
  await neurolink.exportSpan(endedSpan);
} catch (error) {
  // End span with error
  const endedSpan = SpanSerializer.endSpan(
    span,
    SpanStatus.ERROR,
    error.message,
  );
  await neurolink.exportSpan(endedSpan);
  throw error;
}
```

---

## Summary

This implementation guide provides a comprehensive approach to adding Mastra-style observability integrations to NeuroLink. The key benefits include:

1. **Unified Interface**: Single `BaseExporter` class for all platforms
2. **Multi-Platform Support**: 8+ observability platforms supported
3. **Flexible Sampling**: Multiple strategies for production workloads
4. **OpenTelemetry Bridge**: Bidirectional context propagation
5. **Token Tracking**: Comprehensive usage and cost analytics
6. **Backward Compatibility**: Existing Langfuse setup continues to work

The implementation follows NeuroLink's existing patterns (factory pattern, dynamic imports, event-driven architecture) and maintains the zero-overhead principle when observability is disabled.
