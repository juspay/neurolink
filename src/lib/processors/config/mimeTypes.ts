/**
 * MIME Type Constants
 * Centralized MIME type definitions organized by category for file processing
 *
 * @module processors/config/mimeTypes
 */

// =============================================================================
// IMAGE MIME TYPES
// =============================================================================

/**
 * Image format MIME types supported by the platform
 */
export const IMAGE_MIME_TYPES = {
  /** JPEG image format */
  JPEG: "image/jpeg",
  /** PNG image format */
  PNG: "image/png",
  /** GIF image format */
  GIF: "image/gif",
  /** WebP image format */
  WEBP: "image/webp",
  /** SVG vector image format */
  SVG: "image/svg+xml",
  /** BMP bitmap format */
  BMP: "image/bmp",
  /** TIFF image format */
  TIFF: "image/tiff",
  /** AVIF image format */
  AVIF: "image/avif",
  /** HEIC image format (Apple) */
  HEIC: "image/heic",
  /** HEIF image format */
  HEIF: "image/heif",
  /** ICO icon format */
  ICO: "image/x-icon",
  /** Microsoft ICO format */
  ICO_MS: "image/vnd.microsoft.icon",
} as const;

// =============================================================================
// DOCUMENT MIME TYPES
// =============================================================================

/**
 * Document format MIME types for office documents and PDFs
 */
export const DOCUMENT_MIME_TYPES = {
  /** PDF document format */
  PDF: "application/pdf",
  /** Microsoft Word (DOCX) */
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  /** Legacy Microsoft Word (DOC) */
  DOC: "application/msword",
  /** Microsoft Excel (XLSX) */
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  /** Legacy Microsoft Excel (XLS) */
  XLS: "application/vnd.ms-excel",
  /** Microsoft PowerPoint (PPTX) */
  PPTX: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  /** Legacy Microsoft PowerPoint (PPT) */
  PPT: "application/vnd.ms-powerpoint",
  /** OpenDocument Text */
  ODT: "application/vnd.oasis.opendocument.text",
  /** OpenDocument Spreadsheet */
  ODS: "application/vnd.oasis.opendocument.spreadsheet",
  /** OpenDocument Presentation */
  ODP: "application/vnd.oasis.opendocument.presentation",
  /** Rich Text Format */
  RTF: "application/rtf",
  /** RTF as text type */
  RTF_TEXT: "text/rtf",
} as const;

// =============================================================================
// DATA FORMAT MIME TYPES
// =============================================================================

/**
 * Data interchange format MIME types
 */
export const DATA_MIME_TYPES = {
  /** JSON data format */
  JSON: "application/json",
  /** XML data format */
  XML: "application/xml",
  /** XML as text type */
  XML_TEXT: "text/xml",
  /** CSV data format */
  CSV: "text/csv",
  /** YAML data format */
  YAML: "text/yaml",
  /** YAML as application type */
  YAML_APP: "application/x-yaml",
} as const;

// =============================================================================
// TEXT MIME TYPES
// =============================================================================

/**
 * Text format MIME types for plain text and markup
 */
export const TEXT_MIME_TYPES = {
  /** Plain text */
  PLAIN: "text/plain",
  /** HTML markup */
  HTML: "text/html",
  /** XHTML markup */
  XHTML: "application/xhtml+xml",
  /** Markdown text */
  MARKDOWN: "text/markdown",
  /** Markdown text (alternative MIME type) */
  MARKDOWN_ALT: "text/x-markdown",
  /** CSS stylesheet */
  CSS: "text/css",
  /** JavaScript code */
  JAVASCRIPT: "text/javascript",
  /** JavaScript as application type */
  JAVASCRIPT_APP: "application/javascript",
} as const;

// =============================================================================
// SOURCE CODE MIME TYPES
// =============================================================================

/**
 * Programming language source code MIME types
 */
export const SOURCE_CODE_MIME_TYPES = {
  /** TypeScript code */
  TYPESCRIPT: "text/typescript",
  /** Python code */
  PYTHON: "text/x-python",
  /** Java code */
  JAVA: "text/x-java-source",
  /** Go code */
  GO: "text/x-go",
  /** Rust code */
  RUST: "text/x-rustsrc",
  /** C code */
  C: "text/x-c",
  /** C++ code */
  CPP: "text/x-c++",
  /** C# code */
  CSHARP: "text/x-csharp",
  /** Ruby code */
  RUBY: "text/x-ruby",
  /** PHP code */
  PHP: "text/x-php",
  /** Shell script */
  SHELL: "text/x-shellscript",
  /** SQL query */
  SQL: "text/x-sql",
} as const;

// =============================================================================
// ARCHIVE MIME TYPES
// =============================================================================

/**
 * Archive and compressed file MIME types
 */
export const ARCHIVE_MIME_TYPES = {
  /** ZIP archive */
  ZIP: "application/zip",
  /** ZIP compressed variant */
  ZIP_COMPRESSED: "application/x-zip-compressed",
  /** GZIP compressed */
  GZIP: "application/gzip",
  /** TAR archive */
  TAR: "application/x-tar",
  /** RAR archive */
  RAR: "application/x-rar-compressed",
  /** RAR vendor type */
  RAR_VND: "application/vnd.rar",
  /** 7-Zip archive */
  SEVEN_ZIP: "application/x-7z-compressed",
  /** Generic binary stream */
  OCTET_STREAM: "application/octet-stream",
} as const;

// =============================================================================
// MULTIMEDIA MIME TYPES
// =============================================================================

/**
 * Video format MIME types
 */
export const VIDEO_MIME_TYPES = {
  /** MP4 video */
  MP4: "video/mp4",
  /** AVI video */
  AVI: "video/avi",
  /** QuickTime video */
  MOV: "video/quicktime",
  /** Matroska video */
  MKV: "video/x-matroska",
  /** WebM video */
  WEBM: "video/webm",
  /** Flash video */
  FLV: "video/x-flv",
  /** Windows Media Video */
  WMV: "video/x-ms-wmv",
} as const;

/**
 * Audio format MIME types
 */
export const AUDIO_MIME_TYPES = {
  /** MP3 audio */
  MP3: "audio/mpeg",
  /** WAV audio */
  WAV: "audio/wav",
  /** AAC audio */
  AAC: "audio/aac",
  /** FLAC audio */
  FLAC: "audio/flac",
  /** OGG audio */
  OGG: "audio/ogg",
  /** M4A audio */
  M4A: "audio/mp4",
  /** WMA audio */
  WMA: "audio/x-ms-wma",
} as const;

// =============================================================================
// COMBINED MIME TYPES
// =============================================================================

/**
 * All MIME types combined into a single object for convenience
 */
export const MIME_TYPES = {
  // Images
  ...IMAGE_MIME_TYPES,

  // Documents
  ...DOCUMENT_MIME_TYPES,

  // Data formats
  ...DATA_MIME_TYPES,

  // Text formats
  ...TEXT_MIME_TYPES,

  // Source code
  ...SOURCE_CODE_MIME_TYPES,

  // Archives
  ...ARCHIVE_MIME_TYPES,

  // Video
  ...VIDEO_MIME_TYPES,

  // Audio
  ...AUDIO_MIME_TYPES,
} as const;

// =============================================================================
// EXTENSION TO MIME TYPE MAP
// =============================================================================

/**
 * Centralized mapping of file extensions (with leading dot) to MIME types.
 *
 * This is the single source of truth for extension-to-MIME lookups.
 * Derived from the category-specific MIME type constants above so that
 * consumers (e.g. CLI helpers, file detectors) do not need to maintain
 * their own duplicate mappings.
 *
 * If you add a new MIME type constant above, also add its extension mapping
 * here to keep everything in sync.
 */
export const EXTENSION_MIME_MAP: Record<string, string> = {
  // Documents
  ".pdf": DOCUMENT_MIME_TYPES.PDF,
  ".docx": DOCUMENT_MIME_TYPES.DOCX,
  ".doc": DOCUMENT_MIME_TYPES.DOC,
  ".xlsx": DOCUMENT_MIME_TYPES.XLSX,
  ".xls": DOCUMENT_MIME_TYPES.XLS,
  ".odt": DOCUMENT_MIME_TYPES.ODT,
  ".ods": DOCUMENT_MIME_TYPES.ODS,
  ".odp": DOCUMENT_MIME_TYPES.ODP,
  ".rtf": DOCUMENT_MIME_TYPES.RTF,
  ".pptx": DOCUMENT_MIME_TYPES.PPTX,
  ".ppt": DOCUMENT_MIME_TYPES.PPT,

  // Data formats
  ".json": DATA_MIME_TYPES.JSON,
  ".xml": DATA_MIME_TYPES.XML,
  ".yaml": DATA_MIME_TYPES.YAML_APP,
  ".yml": DATA_MIME_TYPES.YAML_APP,
  ".csv": DATA_MIME_TYPES.CSV,
  ".tsv": "text/tab-separated-values",

  // Text and Markup
  ".txt": TEXT_MIME_TYPES.PLAIN,
  ".md": TEXT_MIME_TYPES.MARKDOWN,
  ".markdown": TEXT_MIME_TYPES.MARKDOWN,
  ".html": TEXT_MIME_TYPES.HTML,
  ".htm": TEXT_MIME_TYPES.HTML,
  ".svg": IMAGE_MIME_TYPES.SVG,
  ".log": TEXT_MIME_TYPES.PLAIN,

  // Images
  ".png": IMAGE_MIME_TYPES.PNG,
  ".jpg": IMAGE_MIME_TYPES.JPEG,
  ".jpeg": IMAGE_MIME_TYPES.JPEG,
  ".gif": IMAGE_MIME_TYPES.GIF,
  ".webp": IMAGE_MIME_TYPES.WEBP,
  ".bmp": IMAGE_MIME_TYPES.BMP,
  ".ico": IMAGE_MIME_TYPES.ICO,

  // Source code
  ".js": TEXT_MIME_TYPES.JAVASCRIPT,
  ".mjs": TEXT_MIME_TYPES.JAVASCRIPT,
  ".cjs": TEXT_MIME_TYPES.JAVASCRIPT,
  ".ts": SOURCE_CODE_MIME_TYPES.TYPESCRIPT,
  ".tsx": SOURCE_CODE_MIME_TYPES.TYPESCRIPT,
  ".jsx": TEXT_MIME_TYPES.JAVASCRIPT,
  ".py": SOURCE_CODE_MIME_TYPES.PYTHON,
  ".java": SOURCE_CODE_MIME_TYPES.JAVA,
  ".go": SOURCE_CODE_MIME_TYPES.GO,
  ".rs": SOURCE_CODE_MIME_TYPES.RUST,
  ".rb": SOURCE_CODE_MIME_TYPES.RUBY,
  ".php": SOURCE_CODE_MIME_TYPES.PHP,
  ".c": SOURCE_CODE_MIME_TYPES.C,
  ".cpp": SOURCE_CODE_MIME_TYPES.CPP,
  ".h": SOURCE_CODE_MIME_TYPES.C,
  ".hpp": SOURCE_CODE_MIME_TYPES.CPP,
  ".cs": SOURCE_CODE_MIME_TYPES.CSHARP,
  ".swift": "text/x-swift",
  ".kt": "text/x-kotlin",
  ".scala": "text/x-scala",
  ".sh": SOURCE_CODE_MIME_TYPES.SHELL,
  ".bash": SOURCE_CODE_MIME_TYPES.SHELL,
  ".zsh": SOURCE_CODE_MIME_TYPES.SHELL,
  ".ps1": "text/x-powershell",
  ".sql": SOURCE_CODE_MIME_TYPES.SQL,
  ".r": "text/x-r",
  ".lua": "text/x-lua",
  ".perl": "text/x-perl",
  ".pl": "text/x-perl",

  // Video
  ".mp4": VIDEO_MIME_TYPES.MP4,
  ".m4v": VIDEO_MIME_TYPES.MP4,
  ".mkv": VIDEO_MIME_TYPES.MKV,
  ".mov": VIDEO_MIME_TYPES.MOV,
  ".avi": VIDEO_MIME_TYPES.AVI,
  ".webm": VIDEO_MIME_TYPES.WEBM,
  ".wmv": VIDEO_MIME_TYPES.WMV,
  ".flv": VIDEO_MIME_TYPES.FLV,

  // Audio
  ".mp3": AUDIO_MIME_TYPES.MP3,
  ".wav": AUDIO_MIME_TYPES.WAV,
  ".ogg": AUDIO_MIME_TYPES.OGG,
  ".flac": AUDIO_MIME_TYPES.FLAC,
  ".m4a": AUDIO_MIME_TYPES.M4A,
  ".aac": AUDIO_MIME_TYPES.AAC,
  ".wma": AUDIO_MIME_TYPES.WMA,

  // Archives
  ".zip": ARCHIVE_MIME_TYPES.ZIP,
  ".tar": ARCHIVE_MIME_TYPES.TAR,
  ".gz": ARCHIVE_MIME_TYPES.GZIP,
  ".tgz": ARCHIVE_MIME_TYPES.GZIP,
  ".rar": ARCHIVE_MIME_TYPES.RAR,
  ".7z": ARCHIVE_MIME_TYPES.SEVEN_ZIP,
  ".jar": "application/java-archive",

  // Config files
  ".env": TEXT_MIME_TYPES.PLAIN,
  ".ini": TEXT_MIME_TYPES.PLAIN,
  ".toml": TEXT_MIME_TYPES.PLAIN,
  ".cfg": TEXT_MIME_TYPES.PLAIN,
  ".conf": TEXT_MIME_TYPES.PLAIN,
  ".properties": TEXT_MIME_TYPES.PLAIN,
  ".gitignore": TEXT_MIME_TYPES.PLAIN,
  ".dockerignore": TEXT_MIME_TYPES.PLAIN,
  ".editorconfig": TEXT_MIME_TYPES.PLAIN,
  ".prettierrc": DATA_MIME_TYPES.JSON,
  ".eslintrc": DATA_MIME_TYPES.JSON,
  ".babelrc": DATA_MIME_TYPES.JSON,
};

/**
 * Get MIME type from file extension using the centralized map.
 *
 * @param ext - File extension (with leading dot, e.g. ".pdf")
 * @returns MIME type string, or "application/octet-stream" if unknown
 */
export function getMimeTypeForExtension(ext: string): string {
  return EXTENSION_MIME_MAP[ext.toLowerCase()] || "application/octet-stream";
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/** Type for image MIME type values */
export type ImageMimeType =
  (typeof IMAGE_MIME_TYPES)[keyof typeof IMAGE_MIME_TYPES];

/** Type for document MIME type values */
export type DocumentMimeType =
  (typeof DOCUMENT_MIME_TYPES)[keyof typeof DOCUMENT_MIME_TYPES];

/** Type for data format MIME type values */
export type DataMimeType =
  (typeof DATA_MIME_TYPES)[keyof typeof DATA_MIME_TYPES];

/** Type for text MIME type values */
export type TextMimeType =
  (typeof TEXT_MIME_TYPES)[keyof typeof TEXT_MIME_TYPES];

/** Type for source code MIME type values */
export type SourceCodeMimeType =
  (typeof SOURCE_CODE_MIME_TYPES)[keyof typeof SOURCE_CODE_MIME_TYPES];

/** Type for archive MIME type values */
export type ArchiveMimeType =
  (typeof ARCHIVE_MIME_TYPES)[keyof typeof ARCHIVE_MIME_TYPES];

/** Type for video MIME type values */
export type VideoMimeType =
  (typeof VIDEO_MIME_TYPES)[keyof typeof VIDEO_MIME_TYPES];

/** Type for audio MIME type values */
export type AudioMimeType =
  (typeof AUDIO_MIME_TYPES)[keyof typeof AUDIO_MIME_TYPES];

/** Type for all MIME type values */
export type MimeType = (typeof MIME_TYPES)[keyof typeof MIME_TYPES];
