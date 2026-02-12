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
 *   type FileProcessingResult,
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
  type BatchProcessingSummary,
  // Constants
  DEFAULT_IMAGE_MAX_SIZE_MB,
  DEFAULT_IMAGE_TIMEOUT_MS,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_TEXT_MAX_SIZE_MB,
  DEFAULT_TEXT_TIMEOUT_MS,
  type ExcelWorksheet,
  type FailedFileInfo,
  type FileInfo,
  type FileProcessingError,
  type FileProcessingResult,
  type FileProcessorConfig,
  type FileWarning,
  // Utility functions
  getDefaultImageMaxSizeMB,
  getDefaultImageTimeout,
  getDefaultTextMaxSizeMB,
  getDefaultTextTimeout,
  type JsonTypeGuard,
  type OperationResult,
  PROCESSOR_PRIORITIES,
  type ProcessedConfig,
  type ProcessedExcel,
  type ProcessedFileBase,
  type ProcessedFileInfo,
  type ProcessedHtml,
  type ProcessedJson,
  type ProcessedMarkdown,
  type ProcessedOpenDocument,
  type ProcessedRtf,
  type ProcessedSourceCode,
  type ProcessedSvg,
  type ProcessedText,
  type ProcessedWord,
  type ProcessedYaml,
  type ProcessOptions,
  type ProcessorInfo,
  type ProcessorMatch,
  type ProcessorPriorityKey,
  type ProcessorPriorityValue,
  type RegistryOptions,
  type RegistryProcessResult,
  type RetryConfig,
  type SkippedFileInfo,
  type UnsupportedFileError,
} from "./base/index.js";

// =============================================================================
// CONFIGURATION
// =============================================================================

export {
  AI_VISION_EXTENSIONS,
  ARCHIVE_EXTENSIONS,
  ARCHIVE_LIMITS,
  ARCHIVE_MIME_TYPES,
  type ArchiveExtension,
  type ArchiveMimeType,
  AUDIO_EXTENSIONS,
  AUDIO_MIME_TYPES,
  type AudioExtension,
  type AudioMimeType,
  bytesToMB,
  CONFIG_EXTENSIONS,
  type ConfigExtension,
  CSV_EXTENSIONS,
  DATA_EXTENSIONS,
  DATA_MIME_TYPES,
  DATABASE_EXTENSIONS,
  type DataExtension,
  type DataMimeType,
  DESIGN_EXTENSIONS,
  DOCUMENT_EXTENSIONS,
  DOCUMENT_MIME_TYPES,
  type DocumentExtension,
  type DocumentMimeType,
  detectLanguageFromFilename,
  EXACT_FILENAME_MAP,
  EXCEL_EXTENSIONS,
  EXECUTABLE_EXTENSIONS,
  type ExactFilenameMap,
  FILE_EXTENSIONS,
  type FileExtensions,
  formatBytes,
  getLanguageIdentifier,
  getSizeLimitForType,
  getSupportedExtensions,
  getSupportedFilenames,
  HTML_EXTENSIONS,
  IMAGE_EXTENSIONS,
  IMAGE_MIME_TYPES,
  type ImageExtension,
  type ImageMimeType,
  isSourceCodeFile,
  isWithinSizeLimit,
  JSON_EXTENSIONS,
  LANGUAGE_MAP,
  type LanguageMap,
  MARKDOWN_EXTENSIONS,
  MIME_TYPES,
  type MimeType,
  mbToBytes,
  OPENDOCUMENT_EXTENSIONS,
  PDF_EXTENSIONS,
  POWERPOINT_EXTENSIONS,
  PROCESSING_LIMITS,
  type ProcessingLimitKey,
  RTF_EXTENSIONS,
  SIZE_LIMITS,
  SIZE_LIMITS_BYTES,
  SIZE_LIMITS_MB,
  type SizeLimitBytesKey,
  type SizeLimitMBKey,
  type SizeLimits,
  SOURCE_CODE_EXTENSIONS,
  SOURCE_CODE_MIME_TYPES,
  type SourceCodeExtension,
  type SourceCodeMimeType,
  TEXT_EXTENSIONS,
  TEXT_MIME_TYPES,
  type TextExtension,
  type TextMimeType,
  VIDEO_EXTENSIONS,
  VIDEO_MIME_TYPES,
  type VideoExtension,
  type VideoMimeType,
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
  type ErrorMessageTemplate,
  extractHttpStatus,
  extractSafeMetadata,
  FileErrorCode,
  // Re-export FileProcessingError as ProcessingError alias for backward compat
  type FileProcessingError as ProcessingError,
  type FileProcessingSummary,
  formatFileError,
  generateErrorFingerprint,
  getErrorTemplate,
  getRetryDelay,
  isFileProcessingError,
  isRetryableError,
  isRetryableErrorCode,
  mapErrorToCode,
  type SerializedError,
  type SerializeOptions,
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
  type ProcessorRegistration,
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

export type { ProcessedAudio } from "./media/AudioProcessor.js";
export {
  AudioProcessor,
  audioProcessor,
  isAudioFile,
  processAudio,
} from "./media/AudioProcessor.js";
export type { ProcessedVideo } from "./media/VideoProcessor.js";
export {
  isVideoFile,
  processVideo,
  VideoProcessor,
  videoProcessor,
} from "./media/VideoProcessor.js";

// =============================================================================
// ARCHIVE PROCESSORS
// =============================================================================

export type { ProcessedArchive } from "./archive/ArchiveProcessor.js";
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
  type BatchFileProcessingResult,
  type FileProcessingOptions,
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
  type CliFileProcessingOptions,
  type CliProcessingResult,
  detectMimeType,
  fileExists,
  getCliUsage,
  getFileExtension,
  getSupportedFileTypes as getCliSupportedFileTypes,
  listSupportedFileTypes,
  loadFileFromPath,
  processFileFromPath,
  type SupportedFileTypeInfo,
} from "./cli/index.js";
