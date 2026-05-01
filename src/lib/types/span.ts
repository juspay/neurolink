/**
 * AI-specific span types and data structures
 * Following OpenTelemetry GenAI semantic conventions
 */

/**
 * Span types for AI operations
 * Following OTel GenAI conventions for span categorization
 */
export enum SpanType {
  /** Agent execution run (reserved for future multi-agent support) */
  AGENT_RUN = "agent.run",
  /** Workflow step execution (reserved for future workflow engine) */
  WORKFLOW_STEP = "workflow.step",
  /** Tool/function call */
  TOOL_CALL = "tool.call",
  /** LLM generation request */
  MODEL_GENERATION = "model.generation",
  /** Embedding generation (reserved for future embedding API) */
  EMBEDDING = "embedding",
  /** Retrieval operation (reserved for future RAG support) */
  RETRIEVAL = "retrieval",
  /** Memory operation */
  MEMORY = "memory",
  /** Context compaction operation */
  CONTEXT_COMPACTION = "context.compaction",
  /** RAG pipeline operation */
  RAG = "rag",
  /** Evaluation/scoring operation */
  EVALUATION = "evaluation",
  /** MCP transport operation */
  MCP_TRANSPORT = "mcp.transport",
  /** Media generation (image/video) */
  MEDIA_GENERATION = "media.generation",
  /** PPT/presentation generation */
  PPT_GENERATION = "ppt.generation",
  /** Workflow execution */
  WORKFLOW = "workflow",
  /** TTS synthesis */
  TTS = "tts",
  /** STT transcription */
  STT = "stt",
  /** Server adapter request */
  SERVER_REQUEST = "server.request",
  /** Custom span */
  CUSTOM = "custom",
}

/**
 * Span status codes (following OTel conventions)
 */
export enum SpanStatus {
  UNSET = 0,
  OK = 1,
  ERROR = 2,
  WARNING = 3,
}

/**
 * OpenTelemetry GenAI semantic conventions
 * @see https://opentelemetry.io/docs/specs/semconv/gen-ai/
 */
export const GENAI_ATTRIBUTES = {
  // System and model identification
  GEN_AI_SYSTEM: "gen_ai.system",
  GEN_AI_REQUEST_MODEL: "gen_ai.request.model",
  GEN_AI_RESPONSE_MODEL: "gen_ai.response.model",

  // Token usage
  GEN_AI_USAGE_INPUT_TOKENS: "gen_ai.usage.input_tokens",
  GEN_AI_USAGE_OUTPUT_TOKENS: "gen_ai.usage.output_tokens",
  GEN_AI_USAGE_TOTAL_TOKENS: "gen_ai.usage.total_tokens",

  // Request parameters
  GEN_AI_REQUEST_TEMPERATURE: "gen_ai.request.temperature",
  GEN_AI_REQUEST_TOP_P: "gen_ai.request.top_p",
  GEN_AI_REQUEST_MAX_TOKENS: "gen_ai.request.max_tokens",
  GEN_AI_REQUEST_STOP_SEQUENCES: "gen_ai.request.stop_sequences",

  // Response metadata
  GEN_AI_RESPONSE_FINISH_REASON: "gen_ai.response.finish_reasons",
  GEN_AI_RESPONSE_ID: "gen_ai.response.id",

  // Tool/function calling
  GEN_AI_TOOL_NAME: "gen_ai.tool.name",
  GEN_AI_TOOL_CALL_ID: "gen_ai.tool.call_id",

  // Prompts and completions (optional, privacy-sensitive)
  GEN_AI_PROMPT: "gen_ai.prompt",
  GEN_AI_COMPLETION: "gen_ai.completion",
} as const;

/**
 * Agent-specific conventions (emerging standard)
 */
export const AGENT_ATTRIBUTES = {
  AGENT_NAME: "gen_ai.agent.name",
  AGENT_STEP_TYPE: "gen_ai.agent.step_type",
  AGENT_TOOL_CALLS: "gen_ai.agent.tool_calls",
  AGENT_MEMORY_ACCESS: "gen_ai.agent.memory_access",
  AGENT_REASONING_TRACE: "gen_ai.agent.reasoning_trace",
} as const;

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

  // AI provider attributes (NeuroLink format)
  "ai.provider"?: string;
  "ai.model"?: string;
  "ai.model.version"?: string;

  // Token usage (NeuroLink format)
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
  error?: boolean;

  // Input/Output for serialization
  input?: unknown;
  output?: unknown;
  expected?: unknown;
  scores?: Record<string, number>;

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

/**
 * Complete span data structure
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
 * Langfuse-specific span format
 */
export type LangfuseSpan = {
  id: string;
  traceId: string;
  parentObservationId?: string;
  name: string;
  startTime: string;
  endTime?: string;
  metadata: Record<string, unknown>;
  level: "DEBUG" | "DEFAULT" | "WARNING" | "ERROR";
  statusMessage?: string;
  input?: unknown;
  output?: unknown;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

/**
 * LangSmith-specific run format
 */
export type LangSmithRun = {
  id: string;
  trace_id: string;
  parent_run_id?: string;
  name: string;
  run_type: "llm" | "chain" | "tool" | "retriever" | "embedding";
  start_time: string;
  end_time?: string;
  extra: Record<string, unknown>;
  error?: string;
  inputs?: unknown;
  outputs?: unknown;
  tags?: string[];
};

/**
 * OpenTelemetry span format
 */
export type OtelSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: number;
  endTimeUnixNano?: number;
  attributes: Array<{
    key: string;
    value: { stringValue?: string; intValue?: number; boolValue?: boolean };
  }>;
  status: {
    code: number;
    message?: string;
  };
  events: Array<{
    name: string;
    timeUnixNano: number;
    attributes: Array<{
      key: string;
      value: { stringValue?: string; intValue?: number; boolValue?: boolean };
    }>;
  }>;
};
