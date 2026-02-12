/**
 * Archive Processors Module
 *
 * Exports archive file processors for ZIP, TAR, TAR.GZ, and GZ formats.
 * Handles downloading, validating, and extracting file listings from archives
 * with comprehensive security validation.
 *
 * @module processors/archive
 *
 * @example
 * ```typescript
 * import {
 *   ArchiveProcessor,
 *   archiveProcessor,
 *   isArchiveFile,
 *   processArchive,
 *   type ProcessedArchive,
 *   type ArchiveEntry,
 *   type ArchiveFormat,
 * } from "./archive/index.js";
 *
 * // Check if a file is an archive
 * if (isArchiveFile(file.mimetype, file.name)) {
 *   const result = await processArchive(fileInfo);
 *   if (result.success) {
 *     console.log(`Format: ${result.data.archiveMetadata.format}`);
 *     console.log(`Entries: ${result.data.archiveMetadata.totalEntries}`);
 *     console.log(result.data.textContent);
 *   }
 * }
 * ```
 */

// =============================================================================
// ARCHIVE PROCESSOR
// =============================================================================

export {
  // Types
  type ArchiveEntry,
  type ArchiveFormat,
  // Class
  ArchiveProcessor,
  // Singleton instance
  archiveProcessor,
  // Helper functions
  isArchiveFile,
  type ProcessedArchive,
  processArchive,
} from "./ArchiveProcessor.js";
