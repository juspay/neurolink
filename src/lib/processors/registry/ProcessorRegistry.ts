/**
 * Processor Registry
 *
 * Central registry for file processors with priority-based selection.
 * Uses singleton pattern to ensure a single source of truth for processor registration.
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
 * const registry = getProcessorRegistry();
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
      return "Extract files from the archive and upload individual files.";
    }
    if ([".mp4", ".avi", ".mov", ".mkv", ".wmv"].includes(ext)) {
      return "Video files are not supported. For video transcripts, use a transcription service first.";
    }
    if ([".mp3", ".wav", ".aac", ".ogg", ".flac"].includes(ext)) {
      return "Audio files are not supported. For audio transcripts, use a transcription service first.";
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
// CONVENIENCE EXPORT
// =============================================================================

/**
 * Get the ProcessorRegistry singleton instance.
 * Convenience function for shorter imports.
 *
 * @returns The ProcessorRegistry singleton
 *
 * @example
 * ```typescript
 * import { getProcessorRegistry } from "./registry/index.js";
 *
 * const registry = getProcessorRegistry();
 * registry.register(myProcessor);
 * ```
 */
export const getProcessorRegistry = (): ProcessorRegistry =>
  ProcessorRegistry.getInstance();
