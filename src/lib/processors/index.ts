/**
 * File Processors Module
 *
 * Comprehensive file processing infrastructure for NeuroLink.
 * Provides base classes, configuration, error handling, and registry
 * for building and managing file processors.
 *
 * @module processors
 *
 * @example
 * ```typescript
 * import {
 *   // Base processor infrastructure
 *   BaseFileProcessor,
 *   type FileInfo,
 *   type ProcessorFileProcessingResult,
 *   type ProcessedFileBase,
 *
 *   // Configuration
 *   MIME_TYPES,
 *   FILE_EXTENSIONS,
 *   SIZE_LIMITS,
 *
 *   // Error handling
 *   FileErrorCode,
 *   createFileError,
 *
 *   // Registry
 *   ProcessorRegistry,
 *   getProcessorRegistry,
 *   PROCESSOR_PRIORITIES,
 * } from "./processors/index.js";
 *
 * // Create a custom processor
 * class MyProcessor extends BaseFileProcessor<MyProcessedFile> {
 *   constructor() {
 *     super({
 *       maxSizeMB: 10,
 *       timeoutMs: 30000,
 *       supportedMimeTypes: ["application/x-custom"],
 *       supportedExtensions: [".custom"],
 *       fileTypeName: "custom",
 *       defaultFilename: "file.custom",
 *     });
 *   }
 *
 *   protected buildProcessedResult(buffer: Buffer, fileInfo: FileInfo): MyProcessedFile {
 *     return {
 *       buffer,
 *       mimetype: fileInfo.mimetype,
 *       size: buffer.length,
 *       filename: this.getFilename(fileInfo),
 *     };
 *   }
 * }
 *
 * // Register with the registry
 * const registry = await getProcessorRegistry();
 * registry.register({
 *   name: "custom",
 *   priority: 100,
 *   processor: new MyProcessor(),
 *   isSupported: (mimetype) => mimetype === "application/x-custom",
 * });
 * ```
 */

// =============================================================================
// BASE PROCESSOR INFRASTRUCTURE (single source of truth for ALL types)
// =============================================================================

export {
  // Base class
  BaseFileProcessor,
  // ALL types (single source of truth: base/types.ts)
  // Constants
  DEFAULT_IMAGE_MAX_SIZE_MB,
  DEFAULT_IMAGE_TIMEOUT_MS,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_TEXT_MAX_SIZE_MB,
  DEFAULT_TEXT_TIMEOUT_MS,
  // Utility functions
  getDefaultImageMaxSizeMB,
  getDefaultImageTimeout,
  getDefaultTextMaxSizeMB,
  getDefaultTextTimeout,
  PROCESSOR_PRIORITIES,
} from "./base/index.js";

// =============================================================================
// CONFIGURATION
// =============================================================================

export {
  AI_VISION_EXTENSIONS,
  ARCHIVE_EXTENSIONS,
  ARCHIVE_LIMITS,
  ARCHIVE_MIME_TYPES,
  AUDIO_EXTENSIONS,
  AUDIO_MIME_TYPES,
  bytesToMB,
  CONFIG_EXTENSIONS,
  CSV_EXTENSIONS,
  DATA_EXTENSIONS,
  DATA_MIME_TYPES,
  DATABASE_EXTENSIONS,
  DESIGN_EXTENSIONS,
  DOCUMENT_EXTENSIONS,
  DOCUMENT_MIME_TYPES,
  detectLanguageFromFilename,
  EXACT_FILENAME_MAP,
  EXCEL_EXTENSIONS,
  EXECUTABLE_EXTENSIONS,
  FILE_EXTENSIONS,
  formatBytes,
  getLanguageIdentifier,
  getSizeLimitForType,
  getSupportedExtensions,
  getSupportedFilenames,
  HTML_EXTENSIONS,
  IMAGE_EXTENSIONS,
  IMAGE_MIME_TYPES,
  isSourceCodeFile,
  isWithinSizeLimit,
  JSON_EXTENSIONS,
  LANGUAGE_MAP,
  MARKDOWN_EXTENSIONS,
  MIME_TYPES,
  mbToBytes,
  OPENDOCUMENT_EXTENSIONS,
  PDF_EXTENSIONS,
  POWERPOINT_EXTENSIONS,
  PROCESSING_LIMITS,
  RTF_EXTENSIONS,
  SIZE_LIMITS,
  SIZE_LIMITS_BYTES,
  SIZE_LIMITS_MB,
  SOURCE_CODE_EXTENSIONS,
  SOURCE_CODE_MIME_TYPES,
  TEXT_EXTENSIONS,
  TEXT_MIME_TYPES,
  VIDEO_EXTENSIONS,
  VIDEO_MIME_TYPES,
  validateFileSize,
  WORD_EXTENSIONS,
  XML_EXTENSIONS,
  YAML_EXTENSIONS,
  YAML_LIMITS,
} from "./config/index.js";

// =============================================================================
// ERROR HANDLING (functions and runtime values only — types come from base)
// =============================================================================

export {
  combineSummaries,
  createCustomFileError,
  createFileError,
  createProcessingSummary,
  ERROR_MESSAGES,
  extractHttpStatus,
  extractSafeMetadata,
  FileErrorCode,
  // Re-export FileProcessingError as ProcessingError alias for backward compat
  formatFileError,
  generateErrorFingerprint,
  getErrorTemplate,
  getRetryDelay,
  isFileProcessingError,
  isRetryableError,
  isRetryableErrorCode,
  mapErrorToCode,
  safeStringify,
  serializeError,
  summarizeError,
} from "./errors/index.js";

// =============================================================================
// PROCESSOR REGISTRY (class and registration type only — shared types from base)
// =============================================================================

export {
  getProcessorRegistry,
  getProcessorRegistrySync,
  ProcessorRegistry,
} from "./registry/index.js";

// =============================================================================
// MARKUP PROCESSORS
// =============================================================================

export {
  HtmlProcessor,
  htmlProcessor,
  isHtmlFile,
  isMarkdownFile,
  isSvgFile,
  isTextFile,
  MarkdownProcessor,
  markdownProcessor,
  processHtml,
  processMarkdown,
  processSvg,
  processText,
  SvgProcessor,
  svgProcessor,
  TextProcessor,
  textProcessor,
  validateHtmlSize,
  validateMarkdownSize,
  validateSvgSize,
} from "./markup/index.js";

// =============================================================================
// CODE PROCESSORS
// =============================================================================

export {
  ConfigProcessor,
  configProcessor,
  detectLanguage,
  isConfigFile,
  processConfig,
  processSourceCode,
  SourceCodeProcessor,
  sourceCodeProcessor,
  validateSourceCodeSize,
} from "./code/index.js";

// =============================================================================
// DATA PROCESSORS
// =============================================================================

export {
  isJsonFile,
  isXmlFile,
  isYamlFile,
  JsonProcessor,
  jsonProcessor,
  processJson,
  processXml,
  processYaml,
  validateJsonSize,
  validateXmlSize,
  validateYamlSize,
  XmlProcessor,
  xmlProcessor,
  YamlProcessor,
  yamlProcessor,
} from "./data/index.js";

// =============================================================================
// DOCUMENT PROCESSORS
// =============================================================================

export {
  ExcelProcessor,
  excelProcessor,
  getExcelMaxRows,
  getExcelMaxSheets,
  getExcelMaxSizeMB,
  getOpenDocumentMaxSizeMB,
  isExcelFile,
  isOpenDocumentFile,
  isRtfFile,
  isWordFile,
  OpenDocumentProcessor,
  openDocumentProcessor,
  processExcel,
  processOpenDocument,
  processRtf,
  processWord,
  RtfProcessor,
  rtfProcessor,
  validateExcelSize,
  validateOpenDocumentSize,
  validateRtfSize,
  validateWordSize,
  WordProcessor,
  wordProcessor,
} from "./document/index.js";

// =============================================================================
// MEDIA PROCESSORS
// =============================================================================

export {
  AudioProcessor,
  audioProcessor,
  isAudioFile,
  processAudio,
} from "./media/AudioProcessor.js";
export {
  isVideoFile,
  processVideo,
  VideoProcessor,
  videoProcessor,
} from "./media/VideoProcessor.js";

// =============================================================================
// ARCHIVE PROCESSORS
// =============================================================================

export {
  ArchiveProcessor,
  archiveProcessor,
  isArchiveFile,
  processArchive,
} from "./archive/ArchiveProcessor.js";

// =============================================================================
// FILE PROCESSOR INTEGRATION
// =============================================================================

export {
  getProcessorForFile,
  getSupportedFileTypes,
  isFileTypeSupported,
  processBatchWithRegistry,
  processFileWithRegistry,
} from "./integration/index.js";

// =============================================================================
// CLI HELPERS
// =============================================================================

export {
  detectMimeType,
  fileExists,
  getCliUsage,
  getFileExtension,
  getSupportedFileTypes as getCliSupportedFileTypes,
  listSupportedFileTypes,
  loadFileFromPath,
  processFileFromPath,
} from "./cli/index.js";

// =============================================================================
// STANDALONE SAFETY UTILITIES (extracted from the former I/O processor system)
// =============================================================================

// PII detection, response validation, and tripwire evaluation are now
// standalone utilities in src/lib/utils/ and wired directly into
// generate() and stream() via native options (piiDetection, responseValidation,
// inputValidation). See src/lib/utils/piiDetector.ts, responseValidator.ts,
// and tripwireEvaluator.ts.
