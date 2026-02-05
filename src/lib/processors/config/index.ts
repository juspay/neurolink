/**
 * File Types Configuration
 * Centralized configuration for file processing across all processors
 *
 * @module processors/config
 *
 * @example
 * ```typescript
 * import {
 *   MIME_TYPES,
 *   FILE_EXTENSIONS,
 *   SIZE_LIMITS,
 *   detectLanguageFromFilename
 * } from './config/index.js';
 *
 * // Check MIME type
 * const isPdf = mimeType === MIME_TYPES.PDF;
 *
 * // Check file extension
 * const isImage = FILE_EXTENSIONS.IMAGES.includes(extension);
 *
 * // Detect language
 * const language = detectLanguageFromFilename('app.ts'); // 'TypeScript'
 *
 * // Check size limit
 * const maxSize = SIZE_LIMITS.IMAGE_MAX_MB; // 10
 * ```
 */

// =============================================================================
// MIME TYPES
// =============================================================================

export {
  ARCHIVE_MIME_TYPES,
  type ArchiveMimeType,
  AUDIO_MIME_TYPES,
  type AudioMimeType,
  DATA_MIME_TYPES,
  type DataMimeType,
  DOCUMENT_MIME_TYPES,
  type DocumentMimeType,
  // Extension-to-MIME mapping
  EXTENSION_MIME_MAP,
  getMimeTypeForExtension,
  // Individual MIME type groups
  IMAGE_MIME_TYPES,
  // Types
  type ImageMimeType,
  // Combined MIME types
  MIME_TYPES,
  type MimeType,
  SOURCE_CODE_MIME_TYPES,
  type SourceCodeMimeType,
  TEXT_MIME_TYPES,
  type TextMimeType,
  VIDEO_MIME_TYPES,
  type VideoMimeType,
} from "./mimeTypes.js";

// =============================================================================
// FILE EXTENSIONS
// =============================================================================

export {
  ADA_EXTENSIONS,
  AI_VISION_EXTENSIONS,
  // Archive extensions
  ARCHIVE_EXTENSIONS,
  type ArchiveExtension,
  ASSEMBLY_EXTENSIONS,
  AUDIO_EXTENSIONS,
  type AudioExtension,
  C_EXTENSIONS,
  CLOJURE_EXTENSIONS,
  COBOL_EXTENSIONS,
  // Config extensions
  CONFIG_EXTENSIONS,
  type ConfigExtension,
  CPP_EXTENSIONS,
  CRYSTAL_EXTENSIONS,
  CSHARP_EXTENSIONS,
  CSS_EXTENSIONS,
  CSV_EXTENSIONS,
  D_EXTENSIONS,
  DART_EXTENSIONS,
  DATA_EXTENSIONS,
  // Database extensions
  DATABASE_EXTENSIONS,
  type DataExtension,
  // Design extensions
  DESIGN_EXTENSIONS,
  DOCKERFILE_EXTENSIONS,
  // Document extensions
  DOCUMENT_EXTENSIONS,
  type DocumentExtension,
  EJS_EXTENSIONS,
  ELIXIR_EXTENSIONS,
  ERLANG_EXTENSIONS,
  EXCEL_EXTENSIONS,
  // Executable extensions
  EXECUTABLE_EXTENSIONS,
  // Combined file extensions
  FILE_EXTENSIONS,
  type FileExtensions,
  FORTRAN_EXTENSIONS,
  FSHARP_EXTENSIONS,
  GO_EXTENSIONS,
  GROOVY_EXTENSIONS,
  HANDLEBARS_EXTENSIONS,
  HASKELL_EXTENSIONS,
  HTML_EXTENSIONS,
  // Image extensions
  IMAGE_EXTENSIONS,
  // Types
  type ImageExtension,
  JAVA_EXTENSIONS,
  // Source code extensions (individual)
  JAVASCRIPT_EXTENSIONS,
  // Data format extensions
  JSON_EXTENSIONS,
  JULIA_EXTENSIONS,
  KOTLIN_EXTENSIONS,
  LESS_EXTENSIONS,
  LISP_EXTENSIONS,
  LUA_EXTENSIONS,
  MAKEFILE_EXTENSIONS,
  MARKDOWN_EXTENSIONS,
  NIM_EXTENSIONS,
  OBJECTIVE_C_EXTENSIONS,
  OCAML_EXTENSIONS,
  OPENDOCUMENT_EXTENSIONS,
  PASCAL_EXTENSIONS,
  PDF_EXTENSIONS,
  PERL_EXTENSIONS,
  PHP_EXTENSIONS,
  POWERPOINT_EXTENSIONS,
  POWERSHELL_EXTENSIONS,
  PUG_EXTENSIONS,
  PYTHON_EXTENSIONS,
  R_EXTENSIONS,
  RTF_EXTENSIONS,
  RUBY_EXTENSIONS,
  RUST_EXTENSIONS,
  SCALA_EXTENSIONS,
  SCHEME_EXTENSIONS,
  SCSS_EXTENSIONS,
  SHELL_EXTENSIONS,
  SOURCE_CODE_EXTENSIONS,
  type SourceCodeExtension,
  SQL_EXTENSIONS,
  STYLUS_EXTENSIONS,
  SVELTE_EXTENSIONS,
  SWIFT_EXTENSIONS,
  // Text extensions
  TEXT_EXTENSIONS,
  type TextExtension,
  TYPESCRIPT_EXTENSIONS,
  V_EXTENSIONS,
  // Multimedia extensions
  VIDEO_EXTENSIONS,
  type VideoExtension,
  VUE_EXTENSIONS,
  WORD_EXTENSIONS,
  XML_EXTENSIONS,
  YAML_EXTENSIONS,
  ZIG_EXTENSIONS,
} from "./fileTypes.js";

// =============================================================================
// LANGUAGE DETECTION
// =============================================================================

export {
  // Functions
  detectLanguageFromFilename,
  EXACT_FILENAME_MAP,
  type ExactFilenameMap,
  getLanguageIdentifier,
  getSupportedExtensions,
  getSupportedFilenames,
  isSourceCodeFile,
  // Maps
  LANGUAGE_MAP,
  // Types
  type LanguageMap,
} from "./languageMap.js";

// =============================================================================
// SIZE LIMITS
// =============================================================================

export {
  // Archive security limits
  ARCHIVE_LIMITS,
  // Utility functions
  bytesToMB,
  formatBytes,
  getSizeLimitForType,
  isWithinSizeLimit,
  mbToBytes,
  // Processing limits
  PROCESSING_LIMITS,
  type ProcessingLimitKey,
  // Combined size limits
  SIZE_LIMITS,
  // Size limits in bytes
  SIZE_LIMITS_BYTES,
  // Size limits in MB
  SIZE_LIMITS_MB,
  type SizeLimitBytesKey,
  // Types
  type SizeLimitMBKey,
  type SizeLimits,
  validateFileSize,
  // YAML security limits
  YAML_LIMITS,
} from "./sizeLimits.js";
