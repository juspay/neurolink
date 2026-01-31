/**
 * @file Type definitions for the I/O Processor System.
 * Provides comprehensive types for input/output processing, pipelines, and tripwires.
 */

/**
 * Processor action types - what should happen after processing
 */
export type ProcessorActionType = "continue" | "abort" | "retry";

/**
 * Processor issue severity levels
 */
export type ProcessorIssueSeverity = "info" | "warning" | "error";

/**
 * Processor issue category
 */
export type ProcessorIssueCategory =
  | "pii"
  | "toxicity"
  | "content_moderation"
  | "validation"
  | "security"
  | "quality"
  | "processor_error"
  | "custom";

/**
 * Represents an issue detected during processing
 */
export interface ProcessorIssue {
  /** Category of the issue */
  category: ProcessorIssueCategory;
  /** Severity level of the issue */
  severity: ProcessorIssueSeverity;
  /** Human-readable description of the issue */
  message: string;
  /** The specific content that triggered the issue */
  triggeredContent?: string;
  /** Confidence score for the detection (0-1) */
  confidence?: number;
  /** Additional details about the issue */
  details?: Record<string, unknown>;
}

/**
 * Trace entry for processor execution
 */
export interface ProcessorTraceEntry {
  /** Processor ID */
  processorId: string;
  /** Action taken by the processor */
  action: ProcessorActionType;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Timestamp of execution */
  timestamp: Date;
  /** Whether the processor was skipped due to conditions */
  skipped?: boolean;
  /** Reason for skipping if skipped */
  skipReason?: string;
  /** Issues detected by this processor */
  issues?: ProcessorIssue[];
}

/**
 * Metadata that flows through the processor pipeline
 */
export interface ProcessorMetadata {
  /** Issues accumulated from all processors */
  issues: ProcessorIssue[];
  /** Trace of all processor executions */
  processorTrace: ProcessorTraceEntry[];
  /** The AI provider being used */
  provider?: string;
  /** The model being used */
  model?: string;
  /** Session ID for conversation tracking */
  sessionId?: string;
  /** User ID for user tracking */
  userId?: string;
  /** Custom metadata */
  custom?: Record<string, unknown>;
}

/**
 * Base processor result structure
 */
export interface ProcessorResultBase {
  /** The action to take */
  action: ProcessorActionType;
  /** Updated metadata with issues and trace */
  metadata: ProcessorMetadata;
  /** Feedback message (especially for abort/retry) */
  feedback?: string;
}

/**
 * Continue action result
 */
export interface ProcessorContinueResult<TData> extends ProcessorResultBase {
  action: "continue";
  /** The processed data */
  data: TData;
}

/**
 * Abort action result
 */
export interface ProcessorAbortResult extends ProcessorResultBase {
  action: "abort";
  /** Reason for aborting */
  feedback: string;
}

/**
 * Retry action result
 */
export interface ProcessorRetryResult<TData> extends ProcessorResultBase {
  action: "retry";
  /** Modified data for retry */
  data?: TData;
  /** Instructions for retry */
  feedback: string;
}

/**
 * Discriminated union of processor results
 */
export type ProcessorResult<TData> =
  | ProcessorContinueResult<TData>
  | ProcessorAbortResult
  | ProcessorRetryResult<TData>;

/**
 * Input data structure for input processors
 */
export interface InputProcessorData {
  /** The text content to process */
  text: string;
  /** Optional conversation messages */
  messages?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  /** File attachments if any */
  attachments?: Array<{
    type: "image" | "pdf" | "csv" | "file";
    content: string | Buffer;
    filename?: string;
  }>;
  /** Additional input context */
  context?: Record<string, unknown>;
}

/**
 * Output data structure for output processors
 */
export interface OutputProcessorData {
  /** The response text from the AI */
  responseText: string;
  /** Token usage information */
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  /** Response latency in milliseconds */
  latencyMs?: number;
  /** The original prompt */
  originalPrompt?: string;
  /** Tool calls made during generation */
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
  }>;
  /** Additional output context */
  context?: Record<string, unknown>;
}

/**
 * Base processor configuration
 */
export interface BaseProcessorConfig {
  /** Whether the processor is enabled */
  enabled?: boolean;
  /** Priority for execution order (higher = earlier) */
  priority?: number;
  /** Timeout for processor execution in milliseconds */
  timeoutMs?: number;
}

/**
 * Conditional execution configuration
 */
export interface ProcessorCondition {
  /** Only run for specific providers */
  providers?: string[];
  /** Only run for specific models */
  models?: string[];
  /** Custom condition function */
  condition?: (metadata: ProcessorMetadata) => boolean;
}

/**
 * Full processor configuration including conditions
 */
export interface ProcessorConfig<
  TConfig extends BaseProcessorConfig = BaseProcessorConfig,
> {
  /** The processor configuration */
  config: TConfig;
  /** Conditional execution settings */
  conditions?: ProcessorCondition;
}

/**
 * Validation result for processor configuration
 */
export interface ProcessorValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;
  /** Validation error messages */
  errors: string[];
  /** Validation warnings */
  warnings?: string[];
}

/**
 * Input processor interface
 */
export interface InputProcessor<
  TConfig extends BaseProcessorConfig = BaseProcessorConfig,
> {
  /** Unique identifier for the processor */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what the processor does */
  description: string;
  /** Default priority (higher = earlier execution) */
  priority: number;
  /** Process the input data */
  process(
    data: InputProcessorData,
    metadata: ProcessorMetadata,
    config?: TConfig,
  ): Promise<ProcessorResult<InputProcessorData>>;
  /** Validate the configuration */
  validateConfig?(config: TConfig): ProcessorValidationResult;
}

/**
 * Output processor interface
 */
export interface OutputProcessor<
  TConfig extends BaseProcessorConfig = BaseProcessorConfig,
> {
  /** Unique identifier for the processor */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what the processor does */
  description: string;
  /** Default priority (higher = earlier execution) */
  priority: number;
  /** Process the output data */
  process(
    data: OutputProcessorData,
    metadata: ProcessorMetadata,
    config?: TConfig,
  ): Promise<ProcessorResult<OutputProcessorData>>;
  /** Validate the configuration */
  validateConfig?(config: TConfig): ProcessorValidationResult;
}

/**
 * Registered processor entry with configuration
 */
export interface RegisteredProcessor<
  TProcessor,
  TConfig extends BaseProcessorConfig,
> {
  /** The processor instance */
  processor: TProcessor;
  /** The processor configuration */
  config: ProcessorConfig<TConfig>;
}

/**
 * Processor preset definition
 */
export interface ProcessorPreset {
  /** Unique name for the preset */
  name: string;
  /** Description of the preset */
  description: string;
  /** Input processors to include */
  inputProcessors: Array<{
    id: string;
    config?: Record<string, unknown>;
  }>;
  /** Output processors to include */
  outputProcessors: Array<{
    id: string;
    config?: Record<string, unknown>;
  }>;
}

/**
 * Tripwire configuration for output evaluation
 */
export interface TripwireConfig {
  /** Unique identifier for the tripwire */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what triggers the tripwire */
  description: string;
  /** Condition function to evaluate */
  condition: (
    data: OutputProcessorData,
    metadata: ProcessorMetadata,
  ) => boolean;
  /** Action to take when triggered */
  action: ProcessorActionType;
  /** Feedback message when triggered */
  feedback: string;
  /** Priority (higher = evaluated earlier) */
  priority?: number;
}

/**
 * Tripwire evaluation result
 */
export interface TripwireEvaluationResult {
  /** Whether the tripwire was triggered */
  triggered: boolean;
  /** The tripwire configuration */
  tripwire: TripwireConfig;
  /** The action to take */
  action: ProcessorActionType;
  /** Feedback message */
  feedback?: string;
}

/**
 * Pipeline configuration
 */
export interface ProcessorPipelineConfig {
  /** Name for the pipeline */
  name?: string;
  /** Whether to stop on first abort action */
  stopOnAbort?: boolean;
  /** Global timeout for the entire pipeline in milliseconds */
  pipelineTimeoutMs?: number;
  /** Whether to continue processing even if a processor errors */
  continueOnError?: boolean;
}

/**
 * Pipeline execution result
 */
export interface PipelineExecutionResult<TData> {
  /** Final action from the pipeline */
  action: ProcessorActionType;
  /** The final processed data */
  data?: TData;
  /** Combined metadata from all processors */
  metadata: ProcessorMetadata;
  /** Feedback from processors */
  feedback?: string;
  /** Total execution time in milliseconds */
  totalExecutionTimeMs: number;
  /** Number of processors executed */
  processorsExecuted: number;
  /** Number of processors skipped */
  processorsSkipped: number;
}

/**
 * Processor registry statistics
 */
export interface ProcessorRegistryStats {
  /** Number of registered input processors */
  inputProcessorCount: number;
  /** Number of registered output processors */
  outputProcessorCount: number;
  /** Number of registered presets */
  presetCount: number;
  /** List of registered input processor IDs */
  inputProcessorIds: string[];
  /** List of registered output processor IDs */
  outputProcessorIds: string[];
  /** List of registered preset names */
  presetNames: string[];
}

/**
 * Processor summary for listing
 */
export interface ProcessorSummary {
  /** Processor ID */
  id: string;
  /** Processor name */
  name: string;
  /** Processor description */
  description: string;
  /** Priority */
  priority: number;
}

/**
 * Registry list result
 */
export interface ProcessorListResult {
  /** Input processor summaries */
  input: ProcessorSummary[];
  /** Output processor summaries */
  output: ProcessorSummary[];
}

/**
 * Built processors from a preset
 */
export interface BuiltProcessors {
  /** Input processors with configurations */
  inputProcessors: Array<
    RegisteredProcessor<InputProcessor, BaseProcessorConfig>
  >;
  /** Output processors with configurations */
  outputProcessors: Array<
    RegisteredProcessor<OutputProcessor, BaseProcessorConfig>
  >;
}

/**
 * Registration options
 */
export interface RegistrationOptions {
  /** Whether to replace an existing processor with the same ID */
  replace?: boolean;
}

/**
 * Create a default processor metadata object
 */
export function createDefaultMetadata(
  overrides?: Partial<ProcessorMetadata>,
): ProcessorMetadata {
  return {
    issues: [],
    processorTrace: [],
    ...overrides,
  };
}

/**
 * Create a continue result
 */
export function createContinueResult<TData>(
  data: TData,
  metadata: ProcessorMetadata,
): ProcessorContinueResult<TData> {
  return {
    action: "continue",
    data,
    metadata,
  };
}

/**
 * Create an abort result
 */
export function createAbortResult(
  feedback: string,
  metadata: ProcessorMetadata,
): ProcessorAbortResult {
  return {
    action: "abort",
    feedback,
    metadata,
  };
}

/**
 * Create a retry result
 */
export function createRetryResult<TData>(
  feedback: string,
  metadata: ProcessorMetadata,
  data?: TData,
): ProcessorRetryResult<TData> {
  return {
    action: "retry",
    feedback,
    metadata,
    data,
  };
}
