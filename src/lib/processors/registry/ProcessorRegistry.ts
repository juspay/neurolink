/**
 * Processor Registry
 *
 * Central registry for file processors with priority-based selection.
 * Uses singleton pattern to ensure a single source of truth for processor registration.
 *
 * All 16 BaseFileProcessor-based processors are auto-registered on first access
 * via getProcessorRegistry(). Legacy processors (CSV, Image, PDF, PPTX) that use
 * static methods and don't extend BaseFileProcessor are excluded — they continue
 * to be routed via the switch/case in FileDetector.processFile().
 *
 * Key features:
 * - Priority-based processor selection (lower number = higher priority)
 * - Confidence scoring for match quality
 * - Alias support for alternative processor names
 * - Auto-detection and processing of files
 * - Testing utilities (clear, resetInstance)
 *
 * @module processors/registry/ProcessorRegistry
 *
 * @example
 * ```typescript
 * import { ProcessorRegistry, getProcessorRegistry, PROCESSOR_PRIORITIES } from "./registry/index.js";
 *
 * const registry = await getProcessorRegistry();
 *
 * // Register a processor
 * registry.register({
 *   name: "image",
 *   priority: PROCESSOR_PRIORITIES.IMAGE,
 *   processor: new ImageProcessor(),
 *   isSupported: (mimetype, filename) => mimetype.startsWith("image/"),
 *   description: "Processes images for AI vision",
 * });
 *
 * // Find and use a processor
 * const match = registry.findProcessor("image/jpeg", "photo.jpg");
 * if (match) {
 *   const result = await match.processor.processFile(fileInfo);
 * }
 *
 * // Auto-process a file
 * const result = await registry.processFile(fileInfo);
 * ```
 */

import type { BaseFileProcessor } from "../base/BaseFileProcessor.js";
import type {
  FileInfo,
  FileProcessingResult,
  ProcessedFileBase,
  ProcessOptions,
  ProcessorMatch,
  RegistryOptions,
  RegistryProcessResult,
} from "../base/types.js";

import type { ProcessorRegistration } from "./types.js";

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get file extension from filename.
 *
 * @param filename - The filename to extract extension from
 * @returns Lowercase extension with leading dot, or empty string if none
 */
function getFileExtension(filename: string | null): string {
  if (!filename) {
    return "";
  }
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) {
    return "";
  }
  return filename.substring(lastDot).toLowerCase();
}

// =============================================================================
// PROCESSOR REGISTRY CLASS
// =============================================================================

/**
 * Central registry for file processors.
 * Uses singleton pattern and priority-based selection.
 *
 * Priority system: Lower number = higher priority
 * - 5: SVG (before image, processed as text since AI providers often don't support SVG format)
 * - 10: Image (AI vision)
 * - 20: PDF (document)
 * - 30: CSV (tabular data)
 * - ...
 * - 130: Config files
 *
 * @example
 * ```typescript
 * // Get singleton instance
 * const registry = ProcessorRegistry.getInstance();
 *
 * // Register processors
 * registry.register({
 *   name: "pdf",
 *   priority: 20,
 *   processor: pdfProcessor,
 *   isSupported: isPdfFile,
 * });
 *
 * // Find best processor for a file
 * const match = registry.findProcessor("application/pdf", "document.pdf");
 * ```
 */
export class ProcessorRegistry {
  /** Singleton instance */
  private static instance: ProcessorRegistry | null = null;

  /** Map of processor name (lowercase) to registration */
  private processors: Map<string, ProcessorRegistration> = new Map();

  /** Map of alias (lowercase) to canonical name (lowercase) */
  private aliases: Map<string, string> = new Map();

  /** Flag indicating if default processors have been initialized */
  private initialized = false;

  /**
   * Private constructor for singleton pattern.
   * Use getInstance() to get the registry instance.
   */
  private constructor() {}

  // ===========================================================================
  // SINGLETON MANAGEMENT
  // ===========================================================================

  /**
   * Get the singleton registry instance.
   *
   * @returns The ProcessorRegistry singleton
   *
   * @example
   * ```typescript
   * const registry = ProcessorRegistry.getInstance();
   * ```
   */
  static getInstance(): ProcessorRegistry {
    if (!ProcessorRegistry.instance) {
      ProcessorRegistry.instance = new ProcessorRegistry();
    }
    return ProcessorRegistry.instance;
  }

  /**
   * Reset the singleton instance.
   * Useful for testing to ensure a clean state.
   *
   * @example
   * ```typescript
   * // In test setup/teardown
   * ProcessorRegistry.resetInstance();
   * ```
   */
  static resetInstance(): void {
    ProcessorRegistry.instance = null;
  }

  // ===========================================================================
  // REGISTRATION
  // ===========================================================================

  /**
   * Register a file processor.
   *
   * @typeParam T - The type of processed result
   * @param registration - Processor registration details
   * @param options - Registration options (allowDuplicates, overwriteExisting)
   * @throws Error if processor with same name exists and overwrite not allowed
   *
   * @example
   * ```typescript
   * registry.register({
   *   name: "image",
   *   priority: 10,
   *   processor: imageProcessor,
   *   isSupported: (mimetype, filename) => mimetype.startsWith("image/"),
   *   description: "Processes images for AI vision",
   *   aliases: ["img", "picture"],
   * });
   * ```
   */
  register<T extends ProcessedFileBase>(
    registration: ProcessorRegistration<T>,
    options?: RegistryOptions,
  ): void {
    const normalizedName = registration.name.toLowerCase();

    // Check for existing registration
    if (this.processors.has(normalizedName)) {
      if (options?.overwriteExisting) {
        // Remove old aliases before overwriting
        this.removeAliasesForProcessor(normalizedName);
      } else if (options?.allowDuplicates) {
        // Silently ignore duplicate registration - don't overwrite existing
        return;
      } else {
        throw new Error(
          `Processor "${registration.name}" is already registered. Use overwriteExisting option to replace it.`,
        );
      }
    }

    // Validate registration
    if (!registration.name) {
      throw new Error("Processor name is required");
    }
    if (typeof registration.priority !== "number") {
      throw new Error("Processor priority must be a number");
    }
    if (!registration.processor) {
      throw new Error("Processor instance is required");
    }
    if (typeof registration.isSupported !== "function") {
      throw new Error("isSupported function is required");
    }

    // Register the processor
    this.processors.set(normalizedName, registration as ProcessorRegistration);

    // Register aliases
    if (registration.aliases) {
      for (const alias of registration.aliases) {
        const normalizedAlias = alias.toLowerCase();
        if (normalizedAlias !== normalizedName) {
          this.aliases.set(normalizedAlias, normalizedName);
        }
      }
    }
  }

  /**
   * Unregister a processor by name.
   *
   * @param name - Name of the processor to unregister
   * @returns true if processor was found and removed, false otherwise
   *
   * @example
   * ```typescript
   * const removed = registry.unregister("custom-image");
   * ```
   */
  unregister(name: string): boolean {
    const normalizedName = name.toLowerCase();

    // Remove aliases pointing to this processor
    this.removeAliasesForProcessor(normalizedName);

    return this.processors.delete(normalizedName);
  }

  /**
   * Remove all aliases pointing to a processor.
   *
   * @param normalizedName - Lowercase processor name
   */
  private removeAliasesForProcessor(normalizedName: string): void {
    const aliasEntries = Array.from(this.aliases.entries());
    for (const [alias, target] of aliasEntries) {
      if (target === normalizedName) {
        this.aliases.delete(alias);
      }
    }
  }

  // ===========================================================================
  // PROCESSOR LOOKUP
  // ===========================================================================

  /**
   * Find the best matching processor for a file.
   * Uses priority-based selection when multiple processors match.
   *
   * @param mimetype - MIME type of the file
   * @param filename - Filename (for extension-based detection)
   * @returns Best matching processor or null if none found
   *
   * @example
   * ```typescript
   * const match = registry.findProcessor("image/jpeg", "photo.jpg");
   * if (match) {
   *   console.log(`Using ${match.name} processor`);
   *   const result = await match.processor.processFile(fileInfo);
   * }
   * ```
   */
  findProcessor(mimetype: string, filename: string): ProcessorMatch | null {
    const matches = this.findAllProcessors(mimetype, filename);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Find all matching processors sorted by priority and confidence.
   *
   * @param mimetype - MIME type of the file
   * @param filename - Filename (for extension-based detection)
   * @returns Array of matching processors, sorted by priority (ascending) then confidence (descending)
   *
   * @example
   * ```typescript
   * const matches = registry.findAllProcessors("text/plain", "data.txt");
   * console.log(`Found ${matches.length} processors that can handle this file`);
   *
   * for (const match of matches) {
   *   console.log(`${match.name}: priority=${match.priority}, confidence=${match.confidence}%`);
   * }
   * ```
   */
  findAllProcessors(mimetype: string, filename: string): ProcessorMatch[] {
    const matches: ProcessorMatch[] = [];

    const processorEntries = Array.from(this.processors.entries());
    for (const [name, reg] of processorEntries) {
      try {
        if (reg.isSupported(mimetype, filename)) {
          matches.push({
            name,
            processor: reg.processor,
            priority: reg.priority,
            confidence: this.calculateConfidence(mimetype, filename, reg),
          });
        }
      } catch {
        // Processor's isSupported threw - skip this processor
      }
    }

    // Sort by priority (lower = first), then by confidence (higher = first)
    return matches.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.confidence - a.confidence;
    });
  }

  /**
   * Get a specific processor by name or alias.
   *
   * @param name - Processor name or alias
   * @returns Processor registration or undefined if not found
   *
   * @example
   * ```typescript
   * const pdfProcessor = registry.getProcessor("pdf");
   * // Also works with aliases
   * const imageProcessor = registry.getProcessor("img");
   * ```
   */
  getProcessor(name: string): ProcessorRegistration | undefined {
    const normalizedName = name.toLowerCase();

    // Try direct lookup first
    const direct = this.processors.get(normalizedName);
    if (direct) {
      return direct;
    }

    // Try alias lookup
    const canonicalName = this.aliases.get(normalizedName);
    if (canonicalName) {
      return this.processors.get(canonicalName);
    }

    return undefined;
  }

  /**
   * List all registered processors.
   *
   * @returns Array of all processor registrations
   *
   * @example
   * ```typescript
   * const processors = registry.listProcessors();
   * console.log("Registered processors:");
   * for (const proc of processors) {
   *   console.log(`  ${proc.name} (priority: ${proc.priority})`);
   * }
   * ```
   */
  listProcessors(): ProcessorRegistration[] {
    return Array.from(this.processors.values());
  }

  /**
   * Check if a processor is registered.
   *
   * @param name - Processor name or alias to check
   * @returns true if processor is registered
   *
   * @example
   * ```typescript
   * if (registry.hasProcessor("pdf")) {
   *   console.log("PDF processor is available");
   * }
   * ```
   */
  hasProcessor(name: string): boolean {
    const normalizedName = name.toLowerCase();
    return (
      this.processors.has(normalizedName) || this.aliases.has(normalizedName)
    );
  }

  /**
   * Get list of supported file types/processor names.
   *
   * @returns Array of processor names
   *
   * @example
   * ```typescript
   * const supportedTypes = registry.getSupportedTypes();
   * console.log(`Supported: ${supportedTypes.join(", ")}`);
   * ```
   */
  getSupportedTypes(): string[] {
    return Array.from(this.processors.keys());
  }

  // ===========================================================================
  // FILE PROCESSING
  // ===========================================================================

  /**
   * Auto-detect and process a file using the best matching processor.
   *
   * @param fileInfo - File information including content/URL
   * @param options - Processing options (auth headers, timeout, retry config)
   * @returns Processing result or null if no processor found
   *
   * @example
   * ```typescript
   * const result = await registry.processFile(fileInfo, {
   *   authHeaders: { Authorization: "Bearer token" },
   *   timeout: 60000,
   * });
   *
   * if (result?.success) {
   *   console.log("Processed:", result.data.filename);
   * }
   * ```
   */
  async processFile(
    fileInfo: FileInfo,
    options?: ProcessOptions,
  ): Promise<FileProcessingResult<ProcessedFileBase> | null> {
    const match = this.findProcessor(fileInfo.mimetype, fileInfo.name);
    if (!match) {
      return null;
    }
    const processor = match.processor as BaseFileProcessor<ProcessedFileBase>;
    return processor.processFile(fileInfo, options);
  }

  /**
   * Process a file with detailed result including error information.
   * Returns structured result with either data or error details.
   *
   * @param fileInfo - File information including content/URL
   * @param options - Processing options
   * @returns Result with type, data, and optional error information
   *
   * @example
   * ```typescript
   * const result = await registry.processWithResult(fileInfo);
   *
   * if (result.error) {
   *   console.error(result.error.message);
   *   console.log("Suggestion:", result.error.suggestion);
   *   console.log("Supported types:", result.error.supportedTypes.join(", "));
   * } else {
   *   console.log(`Processed as ${result.type}:`, result.data);
   * }
   * ```
   */
  async processWithResult(
    fileInfo: FileInfo,
    options?: ProcessOptions,
  ): Promise<RegistryProcessResult> {
    const match = this.findProcessor(fileInfo.mimetype, fileInfo.name);

    if (!match) {
      const extension = getFileExtension(fileInfo.name);
      const supportedTypes = this.getSupportedTypes();

      return {
        type: "unsupported",
        data: null,
        error: {
          code: "NO_PROCESSOR_FOUND",
          message: `Unable to process "${fileInfo.name || "file"}": No processor available for this file type.`,
          filename: fileInfo.name || "unknown",
          mimetype: fileInfo.mimetype || "unknown",
          suggestion: this.getSuggestionForFile(fileInfo.mimetype, extension),
          supportedTypes,
        },
      };
    }

    try {
      const processor = match.processor as BaseFileProcessor<ProcessedFileBase>;
      const result = await processor.processFile(fileInfo, options);

      if (result.success && result.data) {
        return { type: match.name, data: result.data };
      } else {
        return {
          type: match.name,
          data: null,
          error: {
            code: "PROCESSING_FAILED",
            message: `Failed to process "${fileInfo.name || "file"}": ${result.error?.message || "Processor returned no data."}`,
            filename: fileInfo.name || "unknown",
            mimetype: fileInfo.mimetype || "unknown",
            suggestion:
              "The file may be corrupted or in an unexpected format. Try re-uploading or converting to a standard format.",
            supportedTypes: this.getSupportedTypes(),
          },
        };
      }
    } catch (error) {
      return {
        type: match.name,
        data: null,
        error: {
          code: "PROCESSING_FAILED",
          message: `Failed to process "${fileInfo.name || "file"}": ${error instanceof Error ? error.message : "Unknown error"}`,
          filename: fileInfo.name || "unknown",
          mimetype: fileInfo.mimetype || "unknown",
          suggestion: "Please check if the file is valid and not corrupted.",
          supportedTypes: this.getSupportedTypes(),
        },
      };
    }
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Clear all registrations.
   * Useful for testing to reset state between tests.
   *
   * @example
   * ```typescript
   * // In test teardown
   * registry.clear();
   * ```
   */
  clear(): void {
    this.processors.clear();
    this.aliases.clear();
    this.initialized = false;
  }

  /**
   * Check if the registry has been initialized with default processors.
   *
   * @returns true if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Mark the registry as initialized.
   * Called after default processors have been registered.
   */
  markInitialized(): void {
    this.initialized = true;
  }

  /**
   * Calculate confidence score for a processor match.
   *
   * @param mimetype - MIME type of the file
   * @param filename - Filename
   * @param reg - Processor registration
   * @returns Confidence score (0-100)
   */
  private calculateConfidence(
    mimetype: string,
    filename: string,
    reg: ProcessorRegistration,
  ): number {
    // Check for exact MIME type match in processor config
    const config = reg.processor.getConfig();
    if (config.supportedMimeTypes) {
      const supportedMimes = config.supportedMimeTypes as string[];
      if (supportedMimes.includes(mimetype.toLowerCase())) {
        return 100; // Exact MIME type match
      }
    }

    // Check for MIME type prefix match (e.g., "image/*")
    const mimePrefix = mimetype.split("/")[0];
    if (mimePrefix && reg.name.toLowerCase() === mimePrefix) {
      return 80; // MIME type category match
    }

    // Check for extension match
    if (config.supportedExtensions) {
      const supportedExts = config.supportedExtensions as string[];
      const ext = getFileExtension(filename);
      if (ext && supportedExts.some((e) => e.toLowerCase() === ext)) {
        return 60; // Extension match
      }
    }

    // Generic match (isSupported returned true but we don't know why)
    return 40;
  }

  /**
   * Get a helpful suggestion based on the file type.
   *
   * @param mimetype - MIME type of the file
   * @param extension - File extension
   * @returns Suggestion string for the user
   */
  private getSuggestionForFile(
    mimetype: string | undefined,
    extension: string,
  ): string {
    const ext = extension.toLowerCase();
    const _mime = mimetype?.toLowerCase() || "";

    // Common unsupported format suggestions
    if (ext === ".heic" || ext === ".heif") {
      return "Convert HEIC images to PNG or JPEG format before uploading.";
    }
    if (ext === ".tiff" || ext === ".tif") {
      return "Convert TIFF images to PNG or JPEG format before uploading.";
    }
    if (ext === ".bmp") {
      return "Convert BMP images to PNG or JPEG format before uploading.";
    }
    if (ext === ".ico") {
      return "Convert ICO files to PNG format before uploading.";
    }
    if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(ext)) {
      return "Archive files are now supported. NeuroLink will list contents and extract metadata.";
    }
    if ([".mp4", ".avi", ".mov", ".mkv", ".wmv"].includes(ext)) {
      return "Video files are now supported. NeuroLink will extract metadata and keyframes.";
    }
    if ([".mp3", ".wav", ".aac", ".ogg", ".flac"].includes(ext)) {
      return "Audio files are now supported. NeuroLink will extract metadata and tags.";
    }
    if ([".psd", ".ai", ".sketch"].includes(ext)) {
      return "Export design files to PNG, PDF, or SVG format before uploading.";
    }
    if ([".exe", ".dll", ".bat", ".sh", ".msi"].includes(ext)) {
      return "Executable files are not supported for security reasons.";
    }
    if ([".db", ".sqlite", ".mdb", ".accdb"].includes(ext)) {
      return "Export database data to CSV or JSON format before uploading.";
    }

    // Generic suggestion with supported formats
    const supportedTypes = this.getSupportedTypes();
    return `Supported formats include: ${supportedTypes.join(", ")}. Please convert your file to a supported format.`;
  }
}

// =============================================================================
// DEFAULT PROCESSOR REGISTRATION
// =============================================================================

/**
 * Register all 16 BaseFileProcessor-based processors with the registry.
 *
 * Legacy processors (CSV, Image, PDF, PPTX) that use static methods and don't
 * extend BaseFileProcessor are excluded — they continue to be routed via the
 * switch/case in FileDetector.processFile().
 *
 * Uses dynamic imports to avoid circular dependencies and enable tree-shaking.
 * Each processor is registered with its priority from PROCESSOR_PRIORITIES,
 * and uses the processor's own isFileSupported() method for detection.
 *
 * @param registry - The ProcessorRegistry instance to register processors into
 */
async function initializeDefaultProcessors(
  registry: ProcessorRegistry,
): Promise<void> {
  // Import all processor singletons via barrel exports
  // Use dynamic import to avoid circular dependency issues
  const [markup, code, data, document, media, archive, priorities] =
    await Promise.all([
      import("../markup/index.js"),
      import("../code/index.js"),
      import("../data/index.js"),
      import("../document/index.js"),
      import("../media/AudioProcessor.js"),
      import("../archive/ArchiveProcessor.js"),
      import("../base/types.js"),
    ]);

  // Also import video separately (same pattern as audio)
  const video = await import("../media/VideoProcessor.js");

  const { PROCESSOR_PRIORITIES: P } = priorities;

  // Registration helper — wraps register() with allowDuplicates to be idempotent
  const reg = (
    name: string,
    priority: number,
    processor: BaseFileProcessor<ProcessedFileBase>,
    description: string,
    aliases?: string[],
  ) => {
    registry.register(
      {
        name,
        priority,
        processor,
        isSupported: (mimetype: string, filename: string) =>
          processor.isFileSupported(mimetype, filename),
        description,
        aliases,
      },
      { allowDuplicates: true },
    );
  };

  // ── Markup processors ────────────────────────────────────────────────────
  reg(
    "svg",
    P.SVG,
    markup.svgProcessor as BaseFileProcessor<ProcessedFileBase>,
    "SVG vector graphics (processed as text, not image)",
    ["svgz"],
  );
  reg(
    "html",
    P.HTML,
    markup.htmlProcessor as BaseFileProcessor<ProcessedFileBase>,
    "HTML web content with OWASP-compliant sanitization",
    ["htm", "xhtml"],
  );
  reg(
    "markdown",
    P.MARKDOWN,
    markup.markdownProcessor as BaseFileProcessor<ProcessedFileBase>,
    "Markdown structured text",
    ["md", "mdx"],
  );
  reg(
    "text",
    P.TEXT,
    markup.textProcessor as BaseFileProcessor<ProcessedFileBase>,
    "Plain text files",
    ["txt", "log"],
  );

  // ── Code processors ──────────────────────────────────────────────────────
  reg(
    "source_code",
    P.SOURCE_CODE,
    code.sourceCodeProcessor as BaseFileProcessor<ProcessedFileBase>,
    "Source code files (50+ languages)",
    ["ts", "js", "py", "java", "go", "rs", "cpp"],
  );
  reg(
    "config",
    P.CONFIG,
    code.configProcessor as BaseFileProcessor<ProcessedFileBase>,
    "Configuration files (.env, .ini, .toml, .cfg)",
    ["env", "ini", "toml", "cfg"],
  );

  // ── Data processors ──────────────────────────────────────────────────────
  reg(
    "json",
    P.JSON,
    data.jsonProcessor as BaseFileProcessor<ProcessedFileBase>,
    "JSON data files",
    ["json", "jsonl", "geojson"],
  );
  reg(
    "yaml",
    P.YAML,
    data.yamlProcessor as BaseFileProcessor<ProcessedFileBase>,
    "YAML configuration and data files",
    ["yaml", "yml"],
  );
  reg(
    "xml",
    P.XML,
    data.xmlProcessor as BaseFileProcessor<ProcessedFileBase>,
    "XML data files",
    ["xml", "xsd", "xsl"],
  );

  // ── Document processors ──────────────────────────────────────────────────
  reg(
    "excel",
    P.EXCEL,
    document.excelProcessor as BaseFileProcessor<ProcessedFileBase>,
    "Excel spreadsheets with sheet extraction",
    ["xlsx", "xls"],
  );
  reg(
    "word",
    P.WORD,
    document.wordProcessor as BaseFileProcessor<ProcessedFileBase>,
    "Word documents with text extraction",
    ["docx"],
  );
  reg(
    "rtf",
    P.RTF,
    document.rtfProcessor as BaseFileProcessor<ProcessedFileBase>,
    "RTF documents",
    ["rtf"],
  );
  reg(
    "opendocument",
    P.OPENDOCUMENT,
    document.openDocumentProcessor as BaseFileProcessor<ProcessedFileBase>,
    "OpenDocument format files",
    ["odt", "ods", "odp"],
  );

  // ── Media processors ─────────────────────────────────────────────────────
  reg(
    "audio",
    P.AUDIO,
    media.audioProcessor as BaseFileProcessor<ProcessedFileBase>,
    "Audio files with metadata and tag extraction",
    ["mp3", "wav", "ogg", "flac", "aac", "m4a", "wma"],
  );
  reg(
    "video",
    P.VIDEO,
    video.videoProcessor as BaseFileProcessor<ProcessedFileBase>,
    "Video files with metadata and keyframe extraction",
    ["mp4", "mkv", "webm", "avi", "mov", "m4v"],
  );

  // ── Archive processors ───────────────────────────────────────────────────
  reg(
    "archive",
    P.ARCHIVE,
    archive.archiveProcessor as BaseFileProcessor<ProcessedFileBase>,
    "Archive files with content listing",
    ["zip", "tar", "gz", "tgz"],
  );

  registry.markInitialized();
}

// =============================================================================
// CONVENIENCE EXPORT
// =============================================================================

/** Promise tracking the ongoing initialization (prevents double-init races) */
let initPromise: Promise<void> | null = null;

/**
 * Get the ProcessorRegistry singleton instance.
 * On first call, auto-initializes with all 16 default processors.
 * Convenience function for shorter imports.
 *
 * @returns The ProcessorRegistry singleton (auto-initialized with default processors)
 *
 * @example
 * ```typescript
 * import { getProcessorRegistry } from "./registry/index.js";
 *
 * const registry = await getProcessorRegistry();
 * const match = registry.findProcessor("image/svg+xml", "icon.svg");
 * ```
 */
export const getProcessorRegistry = async (): Promise<ProcessorRegistry> => {
  const registry = ProcessorRegistry.getInstance();

  if (!registry.isInitialized()) {
    if (!initPromise) {
      initPromise = initializeDefaultProcessors(registry).catch((err) => {
        // Reset so next call retries
        initPromise = null;
        throw err;
      });
    }
    await initPromise;
  }

  return registry;
};

/**
 * Get the ProcessorRegistry singleton instance synchronously (without auto-initialization).
 * Use this when you know the registry is already initialized, or when you only
 * need the raw registry instance (e.g., for manual registration in tests).
 *
 * @returns The ProcessorRegistry singleton (may be empty if not yet initialized)
 */
export const getProcessorRegistrySync = (): ProcessorRegistry =>
  ProcessorRegistry.getInstance();
