/**
 * Input/Output Processor Types for NeuroLink
 *
 * Processors provide a clean abstraction layer for validating, transforming,
 * and enriching data flowing into and out of LLM operations.
 *
 * Key features:
 * - Single Responsibility: Each processor does one thing well
 * - Explicit Control Flow: Clear abort, retry, and continue signals
 * - Pipeline Pattern: Processors chain with data flowing through
 * - Metadata Propagation: Context passes through the pipeline
 * - Type Safety: Full TypeScript support with generics
 *
 * @module processorTypes
 */

import type { JsonObject, JsonValue } from "./common.js";
import type { ChatMessage } from "./conversation.js";
import type { GenerateOptions, GenerateResult } from "./generateTypes.js";
import type { StreamOptions } from "./streamTypes.js";

// ============================================================================
// Core Types
// ============================================================================

/**
 * Processor execution action - determines what happens next in the pipeline
 *
 * - `continue`: Proceed to next processor with (potentially) transformed data
 * - `abort`: Stop processing and return feedback to caller
 * - `retry`: Request LLM regeneration with feedback (output processors only)
 */
export type ProcessorAction = "continue" | "abort" | "retry";

/**
 * Severity levels for processor issues
 */
export type ProcessorSeverity = "info" | "warning" | "error" | "critical";

/**
 * Issue detected by a processor
 */
export type ProcessorIssue = {
  /** Issue category for classification */
  category: string;
  /** Severity level */
  severity: ProcessorSeverity;
  /** Human-readable description */
  message: string;
  /** Additional context */
  context?: JsonObject;
};

/**
 * Trace entry for debugging and observability
 */
export type ProcessorTraceEntry = {
  /** Processor ID */
  processorId: string;
  /** Processor name */
  processorName: string;
  /** Action taken */
  action: ProcessorAction;
  /** Execution time in ms */
  executionTime: number;
  /** Any feedback message */
  feedback?: string;
};

/**
 * Metadata that flows through the processor pipeline
 */
export type ProcessorMetadata = {
  /** Unique request ID */
  requestId: string;
  /** Processing start timestamp */
  timestamp: number;
  /** Provider being used */
  provider?: string;
  /** Model being used */
  model?: string;
  /** Session ID if available */
  sessionId?: string;
  /** User ID if available */
  userId?: string;
  /** Custom metadata added by processors */
  custom: Record<string, JsonValue>;
  /** Issues accumulated during processing */
  issues: ProcessorIssue[];
  /** Trace of processors executed */
  processorTrace: ProcessorTraceEntry[];
};

/**
 * Result returned by any processor
 */
export type ProcessorResult<T = unknown> = {
  /** Action to take - continue pipeline, abort, or retry */
  action: ProcessorAction;
  /** Transformed data (for continue) */
  data?: T;
  /** Feedback message (for abort/retry) */
  feedback?: string;
  /** Issues detected during processing */
  issues?: ProcessorIssue[];
  /** Metadata to merge into pipeline metadata */
  metadata?: Partial<ProcessorMetadata["custom"]>;
  /** For retry: number of attempts made */
  retryCount?: number;
  /** For retry: maximum retries allowed */
  maxRetries?: number;
};

// ============================================================================
// Input Processor Types
// ============================================================================

/**
 * Input data passed to input processors
 */
export type InputProcessorData = {
  /** Original input options */
  options: GenerateOptions | StreamOptions;
  /** Messages being sent to LLM */
  messages: ChatMessage[];
  /** System prompt if any */
  systemPrompt?: string;
  /** Raw text input */
  text?: string;
  /** Pipeline metadata */
  metadata: ProcessorMetadata;
};

/**
 * Input processor interface
 */
export type InputProcessor<TConfig = JsonObject> = {
  /** Unique processor ID */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Description of what this processor does */
  readonly description?: string;
  /** Priority (higher = runs earlier) */
  readonly priority?: number;

  /**
   * Process input data before LLM execution
   * @param data Input data to process
   * @param config Processor configuration
   * @returns Processing result with action and transformed data
   */
  process(
    data: InputProcessorData,
    config?: TConfig,
  ): Promise<ProcessorResult<InputProcessorData>>;

  /**
   * Optional: Validate configuration
   */
  validateConfig?(config: TConfig): { valid: boolean; errors: string[] };
};

/**
 * Factory function type for creating input processors
 */
export type InputProcessorFactory<TConfig = JsonObject> = (
  defaultConfig?: TConfig,
) => InputProcessor<TConfig>;

// ============================================================================
// Output Processor Types
// ============================================================================

/**
 * Output data passed to output processors
 */
export type OutputProcessorData = {
  /** Original input that produced this output */
  input: InputProcessorData;
  /** Generation result */
  result: GenerateResult;
  /** Full response text */
  responseText: string;
  /** Tool calls made */
  toolCalls?: Array<{
    toolName: string;
    args: JsonObject;
    result?: unknown;
  }>;
  /** Pipeline metadata */
  metadata: ProcessorMetadata;
};

/**
 * Output processor interface
 */
export type OutputProcessor<TConfig = JsonObject> = {
  /** Unique processor ID */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Description of what this processor does */
  readonly description?: string;
  /** Priority (higher = runs earlier) */
  readonly priority?: number;

  /**
   * Process output data after LLM execution
   * @param data Output data to process
   * @param config Processor configuration
   * @returns Processing result with action and transformed data
   */
  process(
    data: OutputProcessorData,
    config?: TConfig,
  ): Promise<ProcessorResult<OutputProcessorData>>;

  /**
   * Optional: Validate configuration
   */
  validateConfig?(config: TConfig): { valid: boolean; errors: string[] };
};

/**
 * Factory function type for creating output processors
 */
export type OutputProcessorFactory<TConfig = JsonObject> = (
  defaultConfig?: TConfig,
) => OutputProcessor<TConfig>;

// ============================================================================
// Pipeline Types
// ============================================================================

/**
 * Conditions for processor execution
 */
export type ProcessorConditions = {
  /** Only run for specific providers */
  providers?: string[];
  /** Only run for specific models */
  models?: string[];
  /** Custom condition function */
  custom?: (metadata: ProcessorMetadata) => boolean;
};

/**
 * Configuration for a single processor in the pipeline
 */
export type ProcessorConfig = {
  /** Whether processor is enabled */
  enabled?: boolean;
  /** Processor-specific configuration */
  config?: JsonObject;
  /** Conditions for when to run this processor */
  conditions?: ProcessorConditions;
};

/**
 * Configuration for the processor pipeline
 */
export type ProcessorPipelineConfig = {
  /** Input processors in order */
  inputProcessors?: Array<{
    processor: InputProcessor;
    config?: ProcessorConfig;
  }>;
  /** Output processors in order */
  outputProcessors?: Array<{
    processor: OutputProcessor;
    config?: ProcessorConfig;
  }>;
  /** Global settings */
  settings?: {
    /** Stop on first abort */
    stopOnAbort?: boolean;
    /** Maximum total retries across all processors */
    maxTotalRetries?: number;
    /** Timeout for entire pipeline in ms */
    pipelineTimeout?: number;
    /** Enable detailed tracing */
    enableTracing?: boolean;
  };
};

/**
 * Result from running the processor pipeline
 */
export type PipelineResult<T> = {
  /** Final action (continue if successful) */
  action: ProcessorAction;
  /** Processed data */
  data?: T;
  /** Accumulated feedback messages */
  feedback: string[];
  /** All issues from all processors */
  issues: ProcessorIssue[];
  /** Full metadata including traces */
  metadata: ProcessorMetadata;
  /** Total processing time in ms */
  totalTime: number;
};

// ============================================================================
// Tripwire Types
// ============================================================================

/**
 * Tripwire configuration for blocking conditions
 */
export type TripwireConfig = {
  /** Unique tripwire ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Condition that triggers the tripwire */
  condition: (data: InputProcessorData | OutputProcessorData) => boolean;
  /** Action to take when triggered */
  action: "abort" | "warn" | "log";
  /** Message when triggered */
  message: string;
  /** Severity of the tripwire */
  severity: ProcessorSeverity;
};

/**
 * Result from tripwire evaluation
 */
export type TripwireResult = {
  /** Whether tripwire was triggered */
  triggered: boolean;
  /** Tripwire that was triggered */
  tripwire?: TripwireConfig;
  /** Action to take */
  action?: ProcessorAction;
  /** Feedback message */
  feedback?: string;
};

// ============================================================================
// Abort/Retry Result Types
// ============================================================================

/**
 * Result returned when a processor pipeline aborts
 */
export type ProcessorAbortResult = {
  aborted: true;
  reason: string;
  feedback: string[];
  issues: ProcessorIssue[];
  processorId?: string;
  processorName?: string;
};

/**
 * Extended GenerateResult with processor metadata
 */
export type ProcessorEnhancedResult = GenerateResult & {
  processorMetadata?: ProcessorMetadata;
  processorAborted?: ProcessorAbortResult;
};

// ============================================================================
// Registry Types
// ============================================================================

/**
 * Processor preset configuration
 */
export type ProcessorPreset = {
  name: string;
  description: string;
  inputProcessors: Array<{ id: string; config?: ProcessorConfig }>;
  outputProcessors: Array<{ id: string; config?: ProcessorConfig }>;
};

// ============================================================================
// PII Detection Types
// ============================================================================

/**
 * Types of PII that can be detected
 */
export type PIIType =
  | "email"
  | "phone"
  | "ssn"
  | "credit_card"
  | "ip_address"
  | "address"
  | "name"
  | "date_of_birth"
  | "passport"
  | "driver_license";

/**
 * PII detection processor configuration
 */
export type PIIDetectionConfig = {
  /** PII types to detect */
  detectTypes?: PIIType[];
  /** Action when PII is found */
  action?: "abort" | "redact" | "warn";
  /** Redaction replacement text */
  redactionText?: string;
  /** Custom patterns to detect */
  customPatterns?: Array<{
    name: string;
    pattern: RegExp;
    replacement?: string;
  }>;
  /** Allow specific PII in certain contexts */
  allowList?: Array<{
    type: PIIType;
    context?: string;
  }>;
};

// ============================================================================
// Content Moderation Types
// ============================================================================

/**
 * Content moderation categories
 */
export type ModerationCategory =
  | "hate_speech"
  | "violence"
  | "sexual_content"
  | "self_harm"
  | "harassment"
  | "illegal_activity"
  | "spam"
  | "misinformation";

/**
 * Content moderation processor configuration
 */
export type ContentModerationConfig = {
  /** Categories to check */
  categories?: ModerationCategory[];
  /** Threshold for blocking (0-1) */
  blockThreshold?: number;
  /** Threshold for warning (0-1) */
  warnThreshold?: number;
  /** Use AI-based moderation */
  useAIModeration?: boolean;
  /** AI moderation provider */
  aiProvider?: string;
  /** AI moderation model */
  aiModel?: string;
  /** Custom word list to block */
  blockedWords?: string[];
  /** Custom regex patterns to block */
  blockedPatterns?: string[];
};

// ============================================================================
// Toxicity Check Types
// ============================================================================

/**
 * Toxicity categories
 */
export type ToxicityCategory =
  | "toxicity"
  | "severe_toxicity"
  | "identity_attack"
  | "insult"
  | "profanity"
  | "threat"
  | "sexually_explicit";

/**
 * Toxicity check processor configuration
 */
export type ToxicityCheckConfig = {
  /** Toxicity categories to check */
  categories?: ToxicityCategory[];
  /** Threshold for blocking (0-1) */
  blockThreshold?: number;
  /** Threshold for warning (0-1) */
  warnThreshold?: number;
  /** Action when toxicity is detected */
  action?: "abort" | "retry" | "warn";
  /** Maximum retries for retry action */
  maxRetries?: number;
  /** Provider for toxicity checking */
  provider?: string;
  /** Model for toxicity checking */
  model?: string;
};

// ============================================================================
// Message Validation Types
// ============================================================================

/**
 * Validation result from custom validator
 */
export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

/**
 * Message validation processor configuration
 */
export type MessageValidationConfig = {
  /** Minimum message length */
  minLength?: number;
  /** Maximum message length */
  maxLength?: number;
  /** Required fields in options */
  requiredFields?: string[];
  /** Maximum number of messages */
  maxMessages?: number;
  /** Require system prompt */
  requireSystemPrompt?: boolean;
  /** Custom validation function */
  customValidator?: (data: InputProcessorData) => ValidationResult;
};

// ============================================================================
// Response Validation Types
// ============================================================================

/**
 * Response validation processor configuration
 */
export type ResponseValidationConfig = {
  /** Minimum response length */
  minLength?: number;
  /** Maximum response length */
  maxLength?: number;
  /** Required phrases that must be present */
  requiredPhrases?: string[];
  /** Forbidden phrases that must not be present */
  forbiddenPhrases?: string[];
  /** JSON schema to validate against (if response should be JSON) */
  jsonSchema?: JsonObject;
  /** Retry if validation fails */
  retryOnFailure?: boolean;
  /** Maximum retries */
  maxRetries?: number;
  /** Custom validation function */
  customValidator?: (response: string) => { valid: boolean; errors: string[] };
};

// ============================================================================
// Content Filtering Types
// ============================================================================

/**
 * Content filtering processor configuration
 */
export type ContentFilteringConfig = {
  /** Words to filter/redact */
  filterWords?: string[];
  /** Regex patterns to filter */
  filterPatterns?: string[];
  /** Replacement text */
  replacementText?: string;
  /** Action when content is filtered */
  action?: "redact" | "abort" | "retry";
  /** Maximum retries for retry action */
  maxRetries?: number;
  /** Categories to filter */
  filterCategories?: Array<"profanity" | "pii" | "sensitive" | "custom">;
};

// ============================================================================
// Length Validation Types
// ============================================================================

/**
 * Length validation processor configuration
 */
export type LengthValidationConfig = {
  /** Minimum response length */
  minLength?: number;
  /** Maximum response length */
  maxLength?: number;
  /** Action when validation fails */
  action?: "abort" | "retry" | "truncate" | "warn";
  /** Maximum retries for retry action */
  maxRetries?: number;
  /** Truncation suffix */
  truncationSuffix?: string;
};

// ============================================================================
// Memory Retrieval Types
// ============================================================================

/**
 * Memory retrieval processor configuration
 */
export type MemoryRetrievalConfig = {
  /** Maximum messages to retrieve */
  maxMessages?: number;
  /** Include system messages */
  includeSystemMessages?: boolean;
  /** Memory store type */
  storeType?: "redis" | "in-memory";
  /** Session ID override */
  sessionId?: string;
  /** Enable semantic search for relevant context */
  enableSemanticSearch?: boolean;
  /** Similarity threshold for semantic search */
  similarityThreshold?: number;
};

// ============================================================================
// Memory Persistence Types
// ============================================================================

/**
 * Memory persistence processor configuration
 */
export type MemoryPersistenceConfig = {
  /** Memory store type */
  storeType?: "redis" | "in-memory";
  /** Session ID override */
  sessionId?: string;
  /** Maximum messages to retain */
  maxMessages?: number;
  /** TTL for messages in seconds */
  ttlSeconds?: number;
  /** Include tool calls in memory */
  includeToolCalls?: boolean;
  /** Summarize before storing if over limit */
  enableSummarization?: boolean;
  /** Custom metadata to store */
  customMetadata?: Record<string, unknown>;
};

// ============================================================================
// Semantic Context Types
// ============================================================================

/**
 * Semantic context processor configuration
 */
export type SemanticContextConfig = {
  /** Vector store to search */
  vectorStore?: "pinecone" | "weaviate" | "chromadb" | "custom";
  /** Number of results to retrieve */
  topK?: number;
  /** Minimum similarity score */
  minScore?: number;
  /** Namespace/collection to search */
  namespace?: string;
  /** Custom embedding function */
  embedFunction?: (text: string) => Promise<number[]>;
  /** Format context as system message or user context */
  contextFormat?: "system" | "user" | "both";
};
