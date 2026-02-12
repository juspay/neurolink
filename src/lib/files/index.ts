/**
 * File Reference Architecture
 *
 * Lazy on-demand file processing system. Files are registered as lightweight
 * references with metadata and previews. Full content is processed on-demand
 * when the LLM requests it via tools.
 *
 * @module files
 */

export { FileReferenceRegistry } from "./fileReferenceRegistry.js";
export { createFileTools } from "./fileTools.js";
export { StreamingReader } from "./streamingReader.js";
export type {
  FileReadResult,
  FileReference,
  FileReferenceStatus,
  FileRegistrationOptions,
  FileRegistryOptions,
  FileSearchMatch,
  FileSearchResult,
  OutlineSection,
  SizeTier,
  StreamingReaderOptions,
} from "./types.js";
export { SIZE_TIER_THRESHOLDS } from "./types.js";
