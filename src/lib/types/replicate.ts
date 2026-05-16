/**
 * Replicate Type Definitions
 *
 * Shared types for the Replicate prediction lifecycle (LLM, video,
 * avatar, music handlers all consume these via the types barrel).
 *
 * @module types/replicate
 */

/**
 * Replicate auth payload — bearer token + optional base URL.
 */
export type ReplicateAuth = {
  apiToken: string;
  baseUrl?: string;
};

/**
 * Replicate prediction status (terminal: succeeded / failed / canceled).
 */
export type ReplicatePredictionStatus =
  | "starting"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled";

/**
 * Replicate prediction object as returned by /v1/predictions POST and
 * /v1/predictions/:id GET. Output shape varies by model — caller narrows.
 */
export type ReplicatePrediction = {
  id: string;
  model?: string;
  version?: string;
  status: ReplicatePredictionStatus;
  /** URL string, array of URL strings, base64, or model-specific JSON. */
  output?: unknown;
  error?: string | null;
  metrics?: { predict_time?: number };
  urls?: { get: string; cancel: string };
  logs?: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
};

/**
 * Input shape for Replicate's createPrediction helper.
 */
export type ReplicateCreatePredictionInput = {
  /** Model in "owner/name" or "owner/name:version" form. */
  model: string;
  /** Provider/model-specific input shape. */
  input: Record<string, unknown>;
  /** Optional webhook URL for completion notifications. */
  webhook?: string;
  /** Optional webhook events filter. */
  webhookEventsFilter?: ("start" | "output" | "logs" | "completed")[];
};

/**
 * Options for the Replicate poll loop.
 */
export type ReplicatePollOptions = {
  /** Total time to wait before throwing a timeout error (default 5 min). */
  timeoutMs?: number;
  /** Poll interval in milliseconds (default 2 s). */
  pollIntervalMs?: number;
  /** Caller-supplied AbortSignal to cancel polling early. */
  abortSignal?: AbortSignal;
};
