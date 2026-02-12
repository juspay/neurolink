/**
 * File Reference Architecture Types
 *
 * Types for the lazy on-demand file processing system.
 * Files are registered as lightweight references with metadata and previews.
 * Full content is processed on-demand when the LLM requests it via tools.
 */

/**
 * Size tier thresholds in bytes
 */
export const SIZE_TIER_THRESHOLDS = {
  /** < 10 KB: inline in prompt */
  TINY_MAX: 10 * 1024,
  /** 10 KB – 100 KB: full load with truncation */
  SMALL_MAX: 100 * 1024,
  /** 100 KB – 5 MB: outline + on-demand */
  MEDIUM_MAX: 5 * 1024 * 1024,
  /** 5 MB – 100 MB: streaming + chunked summarization */
  LARGE_MAX: 100 * 1024 * 1024,
  /** 100 MB – 2 GB: reference only */
  HUGE_MAX: 2 * 1024 * 1024 * 1024,
  // > 2 GB: oversized, rejected
} as const;

// Re-export all types from canonical location
export type {
  SizeTier,
  FileReferenceStatus,
  OutlineSection,
  FileReference,
  FileRegistrationOptions,
  FileReadResult,
  FileSearchResult,
  FileSearchMatch,
  StreamingReaderOptions,
  FileExtractionParams,
  FileExtractionResult,
  FileRegistryOptions,
} from "../types/fileReferenceTypes.js";
