/**
 * File Extension Constants
 * Centralized file extension definitions organized by category for file processing
 *
 * @module processors/config/fileTypes
 */

// =============================================================================
// IMAGE FILE EXTENSIONS
// =============================================================================

/**
 * Image file extensions supported by the platform
 */
export const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".tiff",
  ".tif",
  ".avif",
  ".heic",
  ".heif",
  ".ico",
] as const;

/**
 * AI vision-supported image extensions (subset that works with AI models)
 */
export const AI_VISION_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
] as const;

// =============================================================================
// DOCUMENT FILE EXTENSIONS
// =============================================================================

/**
 * Document file extensions for office documents and PDFs
 */
export const DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".doc",
  ".xlsx",
  ".xls",
  ".pptx",
  ".ppt",
  ".odt",
  ".ods",
  ".odp",
  ".rtf",
] as const;

/**
 * PDF document extensions
 */
export const PDF_EXTENSIONS = [".pdf"] as const;

/**
 * Word document extensions
 */
export const WORD_EXTENSIONS = [".docx", ".doc"] as const;

/**
 * Excel spreadsheet extensions
 */
export const EXCEL_EXTENSIONS = [".xlsx", ".xls"] as const;

/**
 * PowerPoint presentation extensions
 */
export const POWERPOINT_EXTENSIONS = [".pptx", ".ppt"] as const;

/**
 * OpenDocument format extensions
 */
export const OPENDOCUMENT_EXTENSIONS = [".odt", ".ods", ".odp"] as const;

/**
 * Rich Text Format extensions
 */
export const RTF_EXTENSIONS = [".rtf"] as const;

// =============================================================================
// DATA FORMAT FILE EXTENSIONS
// =============================================================================

/**
 * JSON data file extensions
 */
export const JSON_EXTENSIONS = [".json"] as const;

/**
 * XML data file extensions
 */
export const XML_EXTENSIONS = [".xml"] as const;

/**
 * CSV data file extensions
 */
export const CSV_EXTENSIONS = [".csv"] as const;

/**
 * YAML data file extensions
 */
export const YAML_EXTENSIONS = [".yaml", ".yml"] as const;

/**
 * All data format extensions combined
 */
export const DATA_EXTENSIONS = [
  ".json",
  ".xml",
  ".csv",
  ".yaml",
  ".yml",
] as const;

// =============================================================================
// TEXT FILE EXTENSIONS
// =============================================================================

/**
 * Plain text file extensions
 */
export const TEXT_EXTENSIONS = [
  ".txt",
  ".md",
  ".markdown",
  ".html",
  ".htm",
  ".css",
  ".log",
] as const;

/**
 * HTML file extensions
 */
export const HTML_EXTENSIONS = [".html", ".htm", ".xhtml"] as const;

/**
 * Markdown file extensions
 */
export const MARKDOWN_EXTENSIONS = [
  ".md",
  ".markdown",
  ".mdown",
  ".mkd",
] as const;

// =============================================================================
// SOURCE CODE FILE EXTENSIONS
// =============================================================================

/**
 * JavaScript/TypeScript extensions
 */
export const JAVASCRIPT_EXTENSIONS = [".js", ".jsx", ".mjs", ".cjs"] as const;

export const TYPESCRIPT_EXTENSIONS = [".ts", ".tsx"] as const;

/**
 * Python extensions
 */
export const PYTHON_EXTENSIONS = [".py", ".pyw", ".pyi"] as const;

/**
 * Java/Kotlin extensions
 */
export const JAVA_EXTENSIONS = [".java"] as const;
export const KOTLIN_EXTENSIONS = [".kt", ".kts"] as const;

/**
 * Systems programming language extensions
 */
export const GO_EXTENSIONS = [".go"] as const;
export const RUST_EXTENSIONS = [".rs"] as const;
export const C_EXTENSIONS = [".c", ".h"] as const;
export const CPP_EXTENSIONS = [".cpp", ".hpp", ".cc", ".cxx", ".hxx"] as const;
export const CSHARP_EXTENSIONS = [".cs"] as const;

/**
 * Scripting language extensions
 */
export const RUBY_EXTENSIONS = [".rb", ".rake"] as const;
export const PHP_EXTENSIONS = [
  ".php",
  ".phtml",
  ".php3",
  ".php4",
  ".php5",
  ".phps",
] as const;
export const SHELL_EXTENSIONS = [
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".ksh",
] as const;
export const PERL_EXTENSIONS = [".pl", ".pm", ".pod", ".t"] as const;
export const LUA_EXTENSIONS = [".lua"] as const;

/**
 * Database/query extensions
 */
export const SQL_EXTENSIONS = [".sql"] as const;

/**
 * Mobile development extensions
 */
export const SWIFT_EXTENSIONS = [".swift"] as const;
export const DART_EXTENSIONS = [".dart"] as const;
export const OBJECTIVE_C_EXTENSIONS = [".m", ".mm"] as const;

/**
 * Functional programming language extensions
 */
export const SCALA_EXTENSIONS = [".scala", ".sc"] as const;
export const HASKELL_EXTENSIONS = [".hs", ".lhs"] as const;
export const ELIXIR_EXTENSIONS = [".ex", ".exs"] as const;
export const ERLANG_EXTENSIONS = [".erl", ".hrl"] as const;
export const CLOJURE_EXTENSIONS = [".clj", ".cljs", ".cljc", ".edn"] as const;
export const FSHARP_EXTENSIONS = [".fs", ".fsx", ".fsi"] as const;
export const OCAML_EXTENSIONS = [".ml", ".mli"] as const;
export const LISP_EXTENSIONS = [".lisp", ".lsp", ".cl"] as const;
export const SCHEME_EXTENSIONS = [".scm", ".ss"] as const;

/**
 * Other programming language extensions
 */
export const GROOVY_EXTENSIONS = [".groovy", ".gvy", ".gy", ".gsh"] as const;
export const POWERSHELL_EXTENSIONS = [".ps1", ".psm1", ".psd1"] as const;
export const R_EXTENSIONS = [".r", ".rmd"] as const;
export const JULIA_EXTENSIONS = [".jl"] as const;
export const NIM_EXTENSIONS = [".nim", ".nims"] as const;
export const ZIG_EXTENSIONS = [".zig"] as const;
export const V_EXTENSIONS = [".v"] as const;
export const CRYSTAL_EXTENSIONS = [".cr"] as const;
export const D_EXTENSIONS = [".d"] as const;
export const ASSEMBLY_EXTENSIONS = [".asm", ".s"] as const;
export const FORTRAN_EXTENSIONS = [
  ".f",
  ".f90",
  ".f95",
  ".f03",
  ".for",
] as const;
export const COBOL_EXTENSIONS = [".cob", ".cbl", ".cobol"] as const;
export const PASCAL_EXTENSIONS = [".pas", ".pp", ".p"] as const;
export const ADA_EXTENSIONS = [".ada", ".adb", ".ads"] as const;

/**
 * Web/template extensions
 */
export const VUE_EXTENSIONS = [".vue"] as const;
export const SVELTE_EXTENSIONS = [".svelte"] as const;
export const HANDLEBARS_EXTENSIONS = [".hbs", ".handlebars"] as const;
export const EJS_EXTENSIONS = [".ejs"] as const;
export const PUG_EXTENSIONS = [".pug", ".jade"] as const;

/**
 * Stylesheet extensions
 */
export const CSS_EXTENSIONS = [".css"] as const;
export const SCSS_EXTENSIONS = [".scss", ".sass"] as const;
export const LESS_EXTENSIONS = [".less"] as const;
export const STYLUS_EXTENSIONS = [".styl", ".stylus"] as const;

/**
 * Build/Config file extensions
 */
export const DOCKERFILE_EXTENSIONS = [".dockerfile"] as const;
export const MAKEFILE_EXTENSIONS = [".mk"] as const;

/**
 * All source code extensions combined.
 * Derived programmatically from per-language arrays to prevent drift.
 */
export const SOURCE_CODE_EXTENSIONS = [
  // JavaScript/TypeScript
  ...JAVASCRIPT_EXTENSIONS,
  ...TYPESCRIPT_EXTENSIONS,
  // Python
  ...PYTHON_EXTENSIONS,
  // Java/Kotlin
  ...JAVA_EXTENSIONS,
  ...KOTLIN_EXTENSIONS,
  // Systems languages
  ...GO_EXTENSIONS,
  ...RUST_EXTENSIONS,
  ...C_EXTENSIONS,
  ...CPP_EXTENSIONS,
  ...CSHARP_EXTENSIONS,
  // Scripting languages
  ...RUBY_EXTENSIONS,
  ...PHP_EXTENSIONS,
  ...SHELL_EXTENSIONS,
  ...PERL_EXTENSIONS,
  ...LUA_EXTENSIONS,
  // Database
  ...SQL_EXTENSIONS,
  // Mobile
  ...SWIFT_EXTENSIONS,
  ...DART_EXTENSIONS,
  ...OBJECTIVE_C_EXTENSIONS,
  // Functional
  ...SCALA_EXTENSIONS,
  ...HASKELL_EXTENSIONS,
  ...ELIXIR_EXTENSIONS,
  ...ERLANG_EXTENSIONS,
  ...CLOJURE_EXTENSIONS,
  ...FSHARP_EXTENSIONS,
  ...OCAML_EXTENSIONS,
  ...LISP_EXTENSIONS,
  ...SCHEME_EXTENSIONS,
  // Other languages
  ...GROOVY_EXTENSIONS,
  ...POWERSHELL_EXTENSIONS,
  ...R_EXTENSIONS,
  ...JULIA_EXTENSIONS,
  ...NIM_EXTENSIONS,
  ...ZIG_EXTENSIONS,
  ...V_EXTENSIONS,
  ...CRYSTAL_EXTENSIONS,
  ...D_EXTENSIONS,
  ...ASSEMBLY_EXTENSIONS,
  ...FORTRAN_EXTENSIONS,
  ...COBOL_EXTENSIONS,
  ...PASCAL_EXTENSIONS,
  ...ADA_EXTENSIONS,
  // Web/templates
  ...VUE_EXTENSIONS,
  ...SVELTE_EXTENSIONS,
  ...HANDLEBARS_EXTENSIONS,
  ...EJS_EXTENSIONS,
  ...PUG_EXTENSIONS,
  // Stylesheets
  ...CSS_EXTENSIONS,
  ...SCSS_EXTENSIONS,
  ...LESS_EXTENSIONS,
  ...STYLUS_EXTENSIONS,
  // Build/Config
  ...DOCKERFILE_EXTENSIONS,
  ...MAKEFILE_EXTENSIONS,
] as const;

// =============================================================================
// CONFIG FILE EXTENSIONS
// =============================================================================

/**
 * Configuration file extensions
 */
export const CONFIG_EXTENSIONS = [
  ".env",
  ".ini",
  ".toml",
  ".cfg",
  ".conf",
  ".config",
  ".properties",
  ".editorconfig",
  ".gitignore",
  ".gitattributes",
  ".npmrc",
  ".yarnrc",
  ".prettierrc",
  ".eslintrc",
  ".babelrc",
] as const;

// =============================================================================
// ARCHIVE FILE EXTENSIONS
// =============================================================================

/**
 * Archive and compressed file extensions
 */
export const ARCHIVE_EXTENSIONS = [
  ".zip",
  ".tar",
  ".gz",
  ".tgz",
  ".tar.gz",
  ".tar.bz2",
  ".bz2",
  ".rar",
  ".7z",
  ".xz",
] as const;

// =============================================================================
// MULTIMEDIA FILE EXTENSIONS
// =============================================================================

/**
 * Video file extensions
 */
export const VIDEO_EXTENSIONS = [
  ".mp4",
  ".avi",
  ".mov",
  ".mkv",
  ".webm",
  ".flv",
  ".wmv",
  ".m4v",
  ".mpg",
  ".mpeg",
] as const;

/**
 * Audio file extensions
 */
export const AUDIO_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".aac",
  ".flac",
  ".ogg",
  ".m4a",
  ".wma",
  ".opus",
] as const;

// =============================================================================
// DESIGN FILE EXTENSIONS
// =============================================================================

/**
 * Design and graphics file extensions
 */
export const DESIGN_EXTENSIONS = [
  ".psd",
  ".psb",
  ".ai",
  ".sketch",
  ".fig",
  ".xd",
] as const;

// =============================================================================
// DATABASE FILE EXTENSIONS
// =============================================================================

/**
 * Database file extensions
 */
export const DATABASE_EXTENSIONS = [
  ".db",
  ".sqlite",
  ".sqlite3",
  ".mdb",
  ".accdb",
] as const;

// =============================================================================
// EXECUTABLE FILE EXTENSIONS
// =============================================================================

/**
 * Executable and binary file extensions (security risk)
 */
export const EXECUTABLE_EXTENSIONS = [
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".app",
  ".bat",
  ".cmd",
  ".vbs",
  ".ps1",
  ".msi",
  ".dmg",
  ".bin",
] as const;

// =============================================================================
// GROUPED FILE EXTENSIONS
// =============================================================================

/**
 * File extensions grouped by category for easy access
 */
export const FILE_EXTENSIONS = {
  // Images
  IMAGES: IMAGE_EXTENSIONS,
  AI_VISION: AI_VISION_EXTENSIONS,

  // Documents
  DOCUMENTS: DOCUMENT_EXTENSIONS,
  PDF: PDF_EXTENSIONS,
  WORD: WORD_EXTENSIONS,
  EXCEL: EXCEL_EXTENSIONS,
  POWERPOINT: POWERPOINT_EXTENSIONS,
  OPENDOCUMENT: OPENDOCUMENT_EXTENSIONS,
  RTF: RTF_EXTENSIONS,

  // Data formats
  DATA: DATA_EXTENSIONS,
  JSON: JSON_EXTENSIONS,
  XML: XML_EXTENSIONS,
  CSV: CSV_EXTENSIONS,
  YAML: YAML_EXTENSIONS,

  // Text
  TEXT: TEXT_EXTENSIONS,
  HTML: HTML_EXTENSIONS,
  MARKDOWN: MARKDOWN_EXTENSIONS,

  // Source code (grouped)
  CODE: {
    JAVASCRIPT: JAVASCRIPT_EXTENSIONS,
    TYPESCRIPT: TYPESCRIPT_EXTENSIONS,
    PYTHON: PYTHON_EXTENSIONS,
    JAVA: JAVA_EXTENSIONS,
    KOTLIN: KOTLIN_EXTENSIONS,
    GO: GO_EXTENSIONS,
    RUST: RUST_EXTENSIONS,
    C: C_EXTENSIONS,
    CPP: CPP_EXTENSIONS,
    CSHARP: CSHARP_EXTENSIONS,
    RUBY: RUBY_EXTENSIONS,
    PHP: PHP_EXTENSIONS,
    SHELL: SHELL_EXTENSIONS,
    PERL: PERL_EXTENSIONS,
    LUA: LUA_EXTENSIONS,
    SQL: SQL_EXTENSIONS,
    SWIFT: SWIFT_EXTENSIONS,
    DART: DART_EXTENSIONS,
    SCALA: SCALA_EXTENSIONS,
    HASKELL: HASKELL_EXTENSIONS,
    ELIXIR: ELIXIR_EXTENSIONS,
    ERLANG: ERLANG_EXTENSIONS,
    CLOJURE: CLOJURE_EXTENSIONS,
    FSHARP: FSHARP_EXTENSIONS,
    GROOVY: GROOVY_EXTENSIONS,
    POWERSHELL: POWERSHELL_EXTENSIONS,
    R: R_EXTENSIONS,
    JULIA: JULIA_EXTENSIONS,
    NIM: NIM_EXTENSIONS,
    ZIG: ZIG_EXTENSIONS,
    V: V_EXTENSIONS,
    CRYSTAL: CRYSTAL_EXTENSIONS,
    ASSEMBLY: ASSEMBLY_EXTENSIONS,
    DOCKERFILE: DOCKERFILE_EXTENSIONS,
    MAKEFILE: MAKEFILE_EXTENSIONS,
  },

  // All source code
  ALL_CODE: SOURCE_CODE_EXTENSIONS,

  // Config files
  CONFIG: CONFIG_EXTENSIONS,

  // Archives
  ARCHIVES: ARCHIVE_EXTENSIONS,

  // Multimedia
  VIDEO: VIDEO_EXTENSIONS,
  AUDIO: AUDIO_EXTENSIONS,

  // Design
  DESIGN: DESIGN_EXTENSIONS,

  // Database
  DATABASE: DATABASE_EXTENSIONS,

  // Executable
  EXECUTABLE: EXECUTABLE_EXTENSIONS,
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================
