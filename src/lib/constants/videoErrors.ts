/**
 * Video Generation Error Codes
 *
 * Centralized error codes for video generation operations.
 * These are for runtime/execution errors during video generation.
 *
 * Pure option/shape validation (missing image option, invalid config values, etc.)
 * is handled by parameterValidation.ts using ERROR_CODES from errorHandling.ts.
 *
 * Error categorization:
 * - INVALID_INPUT → ErrorCategory.execution (runtime I/O failures)
 * - parameterValidation errors → ErrorCategory.validation (schema/option issues)
 *
 * @module constants/videoErrors
 */

export const VIDEO_ERROR_CODES = {
  /** Video generation API call failed */
  GENERATION_FAILED: "VIDEO_GENERATION_FAILED",
  /** Provider (Vertex AI) not properly configured */
  PROVIDER_NOT_CONFIGURED: "VIDEO_PROVIDER_NOT_CONFIGURED",
  /** Provider name not registered with VideoProcessor */
  PROVIDER_NOT_SUPPORTED: "VIDEO_PROVIDER_NOT_SUPPORTED",
  /** Selected provider's handler does not implement generateTransition */
  TRANSITION_NOT_SUPPORTED: "VIDEO_TRANSITION_NOT_SUPPORTED",
  /** Polling for video completion timed out */
  POLL_TIMEOUT: "VIDEO_POLL_TIMEOUT",
  /**
   * Runtime I/O error during input processing.
   * Used for: failed URL fetch, failed file read, corrupt/unreadable buffer.
   * NOT for: missing options or invalid config shapes (use parameterValidation).
   */
  INVALID_INPUT: "VIDEO_INVALID_INPUT",

  // Director Mode error codes
  /** Invalid segment structure (missing prompt or image) */
  DIRECTOR_SEGMENT_MISMATCH: "DIRECTOR_SEGMENT_MISMATCH",
  /** Too many segments requested */
  DIRECTOR_SEGMENT_LIMIT_EXCEEDED: "DIRECTOR_SEGMENT_LIMIT_EXCEEDED",
  /** Invalid transition duration (must be 4, 6, or 8) */
  DIRECTOR_INVALID_TRANSITION_DURATION: "DIRECTOR_INVALID_TRANSITION_DURATION",
  /** A main clip generation call failed (fatal) */
  DIRECTOR_CLIP_FAILED: "DIRECTOR_CLIP_FAILED",
  /** Frame extraction from clip failed */
  DIRECTOR_FRAME_EXTRACTION_FAILED: "DIRECTOR_FRAME_EXTRACTION_FAILED",
  /** Transition clip generation failed (non-fatal, falls back to hard cut) */
  DIRECTOR_TRANSITION_FAILED: "DIRECTOR_TRANSITION_FAILED",
  /** Video merge/concatenation failed */
  DIRECTOR_MERGE_FAILED: "DIRECTOR_MERGE_FAILED",
  /** Pipeline timeout (overall) */
  DIRECTOR_PIPELINE_TIMEOUT: "DIRECTOR_PIPELINE_TIMEOUT",
} as const;
