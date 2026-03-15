/**
 * Utility class for span creation and serialization
 * Handles conversion between NeuroLink's span format and platform-specific formats
 */

import { randomBytes } from "node:crypto";
import {
  type LangfuseSpan,
  type LangSmithRun,
  type OtelSpan,
  type SpanAttributes,
  type SpanData,
  type SpanEvent,
  SpanStatus,
  SpanType,
} from "../types/index.js";

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
      spanId: randomBytes(8).toString("hex"),
      traceId: traceId ?? randomBytes(16).toString("hex"),
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
    const event: SpanEvent = {
      name,
      timestamp: new Date().toISOString(),
      attributes,
    };

    return {
      ...span,
      events: [...span.events, event],
    };
  }

  /**
   * Update span attributes
   */
  static updateAttributes(
    span: SpanData,
    attributes: Partial<SpanAttributes>,
  ): SpanData {
    return {
      ...span,
      attributes: {
        ...span.attributes,
        ...attributes,
      },
    };
  }

  /**
   * Serialize span to JSON for export
   */
  static toJSON(span: SpanData): string {
    return JSON.stringify(span, null, 2);
  }

  /**
   * Instance method to serialize a span object to JSON string
   * @param span - The span data to serialize (can be partial span data)
   * @returns JSON string representation of the span
   */
  serialize(span: Partial<SpanData> | Record<string, unknown>): string {
    return JSON.stringify(span, null, 2);
  }

  /**
   * Instance method to deserialize a JSON string to span data
   * @param json - The JSON string to parse
   * @returns Parsed span data
   */
  deserialize(json: string): SpanData {
    return JSON.parse(json) as SpanData;
  }

  /**
   * Parse span from JSON
   */
  static fromJSON(json: string): SpanData {
    return JSON.parse(json) as SpanData;
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
      // Only pick safe, non-PII attributes for metadata — intentionally excludes
      // input, output, error.stack, and other user content for PII safety
      metadata: filterSafeMetadata(span.attributes),
      level: span.status === SpanStatus.ERROR ? "ERROR" : "DEFAULT",
      statusMessage: span.statusMessage,
      input: span.attributes["input"],
      output: span.attributes["output"],
      usage:
        span.attributes["ai.tokens.total"] !== undefined
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
      run_type: SpanSerializer.mapSpanTypeToLangSmithRunType(span.type),
      start_time: span.startTime,
      end_time: span.endTime,
      extra: { ...span.attributes },
      error: span.status === SpanStatus.ERROR ? span.statusMessage : undefined,
      inputs: span.attributes["input"],
      outputs: span.attributes["output"],
      tags: SpanSerializer.extractTags(span.attributes),
    };
  }

  /**
   * Serialize span for OpenTelemetry format
   */
  static toOtelFormat(span: SpanData): OtelSpan {
    return {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      name: span.name,
      kind: 1, // SPAN_KIND_INTERNAL
      startTimeUnixNano: new Date(span.startTime).getTime() * 1_000_000,
      endTimeUnixNano: span.endTime
        ? new Date(span.endTime).getTime() * 1_000_000
        : undefined,
      attributes: Object.entries(span.attributes)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => ({
          key,
          value: SpanSerializer.toOtelAttributeValue(value),
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
              value: SpanSerializer.toOtelAttributeValue(v),
            }))
          : [],
      })),
    };
  }

  /**
   * Convert value to OTel attribute value format
   */
  private static toOtelAttributeValue(value: unknown): {
    stringValue?: string;
    intValue?: number;
    boolValue?: boolean;
  } {
    if (typeof value === "string") {
      return { stringValue: value };
    }
    if (typeof value === "number") {
      return Number.isInteger(value)
        ? { intValue: value }
        : { stringValue: String(value) };
    }
    if (typeof value === "boolean") {
      return { boolValue: value };
    }
    return { stringValue: JSON.stringify(value) };
  }

  /**
   * Map NeuroLink span type to LangSmith run type
   */
  private static mapSpanTypeToLangSmithRunType(
    type: SpanType,
  ): "llm" | "chain" | "tool" | "retriever" | "embedding" {
    const mapping: Record<
      SpanType,
      "llm" | "chain" | "tool" | "retriever" | "embedding"
    > = {
      [SpanType.AGENT_RUN]: "chain",
      [SpanType.WORKFLOW_STEP]: "chain",
      [SpanType.TOOL_CALL]: "tool",
      [SpanType.MODEL_GENERATION]: "llm",
      [SpanType.EMBEDDING]: "embedding",
      [SpanType.RETRIEVAL]: "retriever",
      [SpanType.MEMORY]: "chain",
      [SpanType.CONTEXT_COMPACTION]: "chain",
      [SpanType.RAG]: "retriever",
      [SpanType.EVALUATION]: "chain",
      [SpanType.MCP_TRANSPORT]: "tool",
      [SpanType.MEDIA_GENERATION]: "llm",
      [SpanType.PPT_GENERATION]: "chain",
      [SpanType.WORKFLOW]: "chain",
      [SpanType.TTS]: "chain",
      [SpanType.SERVER_REQUEST]: "chain",
      [SpanType.CUSTOM]: "chain",
    };
    return mapping[type] || "chain";
  }

  /**
   * Extract tags from span attributes for LangSmith
   */
  private static extractTags(attributes: SpanAttributes): string[] {
    const tags: string[] = [];
    if (attributes["ai.provider"]) {
      tags.push(`provider:${attributes["ai.provider"]}`);
    }
    if (attributes["ai.model"]) {
      tags.push(`model:${attributes["ai.model"]}`);
    }
    if (attributes["deployment.environment"]) {
      tags.push(`env:${attributes["deployment.environment"]}`);
    }
    if (attributes["tool.name"]) {
      tags.push(`tool:${attributes["tool.name"]}`);
    }
    return tags;
  }

  /**
   * Create a generation span with AI-specific attributes
   */
  static createGenerationSpan(params: {
    provider: string;
    model: string;
    name?: string;
    parentSpanId?: string;
    traceId?: string;
    temperature?: number;
    maxTokens?: number;
    input?: unknown;
    userId?: string;
    sessionId?: string;
  }): SpanData {
    return SpanSerializer.createSpan(
      SpanType.MODEL_GENERATION,
      params.name ?? `gen_ai.${params.provider}.chat`,
      {
        "ai.provider": params.provider,
        "ai.model": params.model,
        "ai.temperature": params.temperature,
        "ai.max_tokens": params.maxTokens,
        input: params.input,
        "user.id": params.userId,
        "session.id": params.sessionId,
      },
      params.parentSpanId,
      params.traceId,
    );
  }

  /**
   * Create a tool call span
   */
  static createToolCallSpan(params: {
    toolName: string;
    server?: string;
    input?: unknown;
    parentSpanId?: string;
    traceId?: string;
  }): SpanData {
    return SpanSerializer.createSpan(
      SpanType.TOOL_CALL,
      `tool.${params.toolName}`,
      {
        "tool.name": params.toolName,
        "tool.server": params.server,
        input: params.input,
      },
      params.parentSpanId,
      params.traceId,
    );
  }

  /**
   * Enrich span with token usage
   */
  static enrichWithTokenUsage(
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
    return SpanSerializer.updateAttributes(span, {
      "ai.tokens.input": usage.promptTokens ?? 0,
      "ai.tokens.output": usage.completionTokens ?? 0,
      "ai.tokens.total":
        usage.totalTokens ??
        (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0),
      "ai.tokens.cache_creation": usage.cacheCreationTokens,
      "ai.tokens.cache_read": usage.cacheReadTokens,
      "ai.tokens.reasoning": usage.reasoningTokens,
    });
  }

  /**
   * Enrich span with cost information
   */
  static enrichWithCost(
    span: SpanData,
    cost: {
      inputCost?: number;
      outputCost?: number;
      totalCost: number;
      currency?: string;
    },
  ): SpanData {
    return SpanSerializer.updateAttributes(span, {
      "ai.cost.input": cost.inputCost,
      "ai.cost.output": cost.outputCost,
      "ai.cost.total": cost.totalCost,
      "ai.cost.currency": cost.currency ?? "USD",
    });
  }
}

// Safe metadata filtering imported from shared module to avoid duplication
import { filterSafeMetadata } from "./safeMetadata.js";
