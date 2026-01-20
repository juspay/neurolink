/**
 * Parameter Validation Utilities
 * Provides consistent parameter validation across all tool interfaces
 */

import type { AIProviderName } from "../constants/enums.js";
import { SYSTEM_LIMITS } from "../core/constants.js";
import type {
  GenerateOptions,
  TextGenerationOptions,
} from "../types/generateTypes.js";
import type { NeuroLinkMCPTool } from "../types/mcpTypes.js";
import type { VideoOutputOptions } from "../types/multimodal.js";
import type { PPTOutputOptions } from "../types/pptTypes.js";
import type { StreamOptions } from "../types/streamTypes.js";
import type { EnhancedValidationResult } from "../types/tools.js";
import type {
  StandardRecord,
  StringArray,
  ValidationSchema,
} from "../types/typeAliases.js";
import { ErrorFactory, NeuroLinkError } from "./errorHandling.js";
import { isNonNullObject } from "./typeUtils.js";

// ============================================================================
// VALIDATION ERROR TYPES
// ============================================================================

/**
 * Custom error class for parameter validation failures
 * Provides detailed information about validation errors including field context and suggestions
 */
export class ValidationError extends Error {
  /**
   * Creates a new ValidationError
   * @param message - Human-readable error message
   * @param field - Name of the field that failed validation (optional)
   * @param code - Error code for programmatic handling (optional)
   * @param suggestions - Array of suggested fixes (optional)
   */
  constructor(
    message: string,
    public field?: string,
    public code?: string,
    public suggestions?: StringArray,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

// ============================================================================
// BASIC PARAMETER VALIDATORS
// ============================================================================

/**
 * Validate that a string parameter is present and non-empty
 */
export function validateRequiredString(
  value: unknown,
  fieldName: string,
  minLength = 1,
): ValidationError | null {
  if (value === undefined || value === null) {
    return new ValidationError(
      `${fieldName} is required`,
      fieldName,
      "REQUIRED_FIELD",
      [`Provide a valid ${fieldName.toLowerCase()}`],
    );
  }

  if (typeof value !== "string") {
    return new ValidationError(
      `${fieldName} must be a string, received ${typeof value}`,
      fieldName,
      "INVALID_TYPE",
      [`Convert ${fieldName.toLowerCase()} to string format`],
    );
  }

  if (value.trim().length < minLength) {
    return new ValidationError(
      `${fieldName} must be at least ${minLength} character${minLength > 1 ? "s" : ""} long`,
      fieldName,
      "MIN_LENGTH",
      [`Provide a meaningful ${fieldName.toLowerCase()}`],
    );
  }

  return null;
}

/**
 * Validate that a number parameter is within acceptable range
 */
export function validateNumberRange(
  value: unknown,
  fieldName: string,
  min: number,
  max: number,
  required = false,
): ValidationError | null {
  if (value === undefined || value === null) {
    if (required) {
      return new ValidationError(
        `${fieldName} is required`,
        fieldName,
        "REQUIRED_FIELD",
        [`Provide a number between ${min} and ${max}`],
      );
    }
    return null; // Optional field
  }

  if (typeof value !== "number" || isNaN(value)) {
    return new ValidationError(
      `${fieldName} must be a valid number, received ${typeof value}`,
      fieldName,
      "INVALID_TYPE",
      [`Provide a number between ${min} and ${max}`],
    );
  }

  if (value < min || value > max) {
    return new ValidationError(
      `${fieldName} must be between ${min} and ${max}, received ${value}`,
      fieldName,
      "OUT_OF_RANGE",
      [`Use a value between ${min} and ${max}`],
    );
  }

  return null;
}

/**
 * Validate that a function parameter is async and has correct signature
 */
export function validateAsyncFunction(
  value: unknown,
  fieldName: string,
  expectedParams: StringArray = [],
): ValidationError | null {
  if (typeof value !== "function") {
    return new ValidationError(
      `${fieldName} must be a function, received ${typeof value}`,
      fieldName,
      "INVALID_TYPE",
      [
        "Provide an async function",
        `Expected signature: async (${expectedParams.join(", ")}) => Promise<unknown>`,
      ],
    );
  }

  // Check if function appears to be async
  const funcStr = value.toString();
  const isAsync = funcStr.includes("async") || funcStr.includes("Promise");

  if (!isAsync) {
    return new ValidationError(
      `${fieldName} must be an async function that returns a Promise`,
      fieldName,
      "NOT_ASYNC",
      [
        "Add 'async' keyword to function declaration",
        "Return a Promise from the function",
        `Example: async (${expectedParams.join(", ")}) => { return result; }`,
      ],
    );
  }

  return null;
}

/**
 * Validate object structure with required properties
 */
export function validateObjectStructure(
  value: unknown,
  fieldName: string,
  requiredProperties: StringArray,
  optionalProperties: StringArray = [],
): ValidationError | null {
  if (!isNonNullObject(value)) {
    return new ValidationError(
      `${fieldName} must be an object, received ${typeof value}`,
      fieldName,
      "INVALID_TYPE",
      [
        `Provide an object with properties: ${requiredProperties.join(", ")}`,
        ...(optionalProperties.length > 0
          ? [`Optional properties: ${optionalProperties.join(", ")}`]
          : []),
      ],
    );
  }

  const obj = value as StandardRecord;
  const missingProps = requiredProperties.filter((prop) => !(prop in obj));

  if (missingProps.length > 0) {
    return new ValidationError(
      `${fieldName} is missing required properties: ${missingProps.join(", ")}`,
      fieldName,
      "MISSING_PROPERTIES",
      [`Add missing properties: ${missingProps.join(", ")}`],
    );
  }

  return null;
}

// ============================================================================
// TOOL-SPECIFIC VALIDATORS
// ============================================================================

/**
 * Validate tool name according to naming conventions
 */
export function validateToolName(name: unknown): ValidationError | null {
  const error = validateRequiredString(name, "Tool name", 1);
  if (error) {
    return error;
  }

  const toolName = name as string;

  // Check naming conventions
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(toolName)) {
    return new ValidationError(
      "Tool name must start with a letter and contain only letters, numbers, underscores, and hyphens",
      "name",
      "INVALID_FORMAT",
      [
        "Use alphanumeric characters, underscores, and hyphens only",
        "Start with a letter",
        "Examples: 'calculateSum', 'data_processor', 'api-client'",
      ],
    );
  }

  if (toolName.length > 64) {
    return new ValidationError(
      `Tool name too long: ${toolName.length} characters (max: 64)`,
      "name",
      "MAX_LENGTH",
      ["Use a shorter, more concise name"],
    );
  }

  // Reserved names check
  const reservedNames = ["execute", "validate", "setup", "init", "config"];
  if (reservedNames.includes(toolName.toLowerCase())) {
    return new ValidationError(
      `Tool name '${toolName}' is reserved`,
      "name",
      "RESERVED_NAME",
      ["Choose a different name", "Add a prefix or suffix to make it unique"],
    );
  }

  return null;
}

/**
 * Validate tool description for clarity and usefulness
 */
export function validateToolDescription(
  description: unknown,
): ValidationError | null {
  const error = validateRequiredString(description, "Tool description", 10);
  if (error) {
    return error;
  }

  const desc = description as string;

  if (desc.length > 500) {
    return new ValidationError(
      `Tool description too long: ${desc.length} characters (max: 500)`,
      "description",
      "MAX_LENGTH",
      ["Keep description concise and focused", "Use under 500 characters"],
    );
  }

  // Check for meaningful content
  const meaningfulWords = desc.split(/\s+/).filter((word) => word.length > 2);
  if (meaningfulWords.length < 3) {
    return new ValidationError(
      "Tool description should be more descriptive",
      "description",
      "TOO_BRIEF",
      [
        "Explain what the tool does",
        "Include expected parameters",
        "Describe the return value",
      ],
    );
  }

  return null;
}

/**
 * Validate MCP tool structure comprehensively
 */
export function validateMCPTool(tool: unknown): EnhancedValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const suggestions: StringArray = [];

  if (!isNonNullObject(tool)) {
    errors.push(
      new ValidationError("Tool must be an object", "tool", "INVALID_TYPE", [
        "Provide a valid tool object with name, description, and execute properties",
      ]),
    );
    return { isValid: false, errors, warnings, suggestions };
  }

  const mcpTool = tool as Partial<NeuroLinkMCPTool>;

  // Validate name
  const nameError = validateToolName(mcpTool.name);
  if (nameError) {
    errors.push(nameError);
  }

  // Validate description
  const descError = validateToolDescription(mcpTool.description);
  if (descError) {
    errors.push(descError);
  }

  // Validate execute function
  const execError = validateAsyncFunction(mcpTool.execute, "execute function", [
    "params",
    "context",
  ]);
  if (execError) {
    errors.push(execError);
  }

  // Simplified validation - just check if execute is a function
  if (mcpTool.execute && typeof mcpTool.execute !== "function") {
    errors.push(
      new ValidationError(
        "Execute must be a function",
        "execute",
        "INVALID_TYPE",
        ["Provide a function for the execute property"],
      ),
    );
  }

  // Check optional properties
  if (mcpTool.inputSchema && !isNonNullObject(mcpTool.inputSchema)) {
    warnings.push("inputSchema should be an object if provided");
    suggestions.push(
      "Provide a valid JSON schema or Zod schema for input validation",
    );
  }

  if (mcpTool.outputSchema && !isNonNullObject(mcpTool.outputSchema)) {
    warnings.push("outputSchema should be an object if provided");
    suggestions.push(
      "Provide a valid JSON schema or Zod schema for output validation",
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

// ============================================================================
// OPTIONS VALIDATORS
// ============================================================================

/**
 * Validate text generation options
 */
export function validateTextGenerationOptions(
  options: unknown,
): EnhancedValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const suggestions: StringArray = [];

  if (!isNonNullObject(options)) {
    errors.push(
      new ValidationError(
        "Options must be an object",
        "options",
        "INVALID_TYPE",
      ),
    );
    return { isValid: false, errors, warnings, suggestions };
  }

  const opts = options as Partial<TextGenerationOptions>;

  // Validate prompt
  const promptError = validateRequiredString(opts.prompt, "prompt", 1);
  if (promptError) {
    errors.push(promptError);
  }

  if (opts.prompt && opts.prompt.length > SYSTEM_LIMITS.MAX_PROMPT_LENGTH) {
    errors.push(
      new ValidationError(
        `Prompt too large: ${opts.prompt.length} characters (max: ${SYSTEM_LIMITS.MAX_PROMPT_LENGTH})`,
        "prompt",
        "MAX_LENGTH",
        [
          "Break prompt into smaller chunks",
          "Use summarization for long content",
          "Consider using streaming for large inputs",
        ],
      ),
    );
  }

  // Validate temperature
  const tempError = validateNumberRange(opts.temperature, "temperature", 0, 2);
  if (tempError) {
    errors.push(tempError);
  }

  // Validate maxTokens
  const tokensError = validateNumberRange(
    opts.maxTokens,
    "maxTokens",
    1,
    128000,
  );
  if (tokensError) {
    errors.push(tokensError);
  }

  // Validate timeout
  if (opts.timeout !== undefined) {
    if (typeof opts.timeout === "string") {
      // Parse string timeouts like "30s", "2m", "1h"
      if (!/^\d+[smh]?$/.test(opts.timeout)) {
        errors.push(
          new ValidationError(
            "Invalid timeout format. Use number (ms) or string like '30s', '2m', '1h'",
            "timeout",
            "INVALID_FORMAT",
            ["Use format: 30000 (ms), '30s', '2m', or '1h'"],
          ),
        );
      }
    } else if (typeof opts.timeout === "number") {
      if (opts.timeout < 1000 || opts.timeout > 600000) {
        warnings.push("Timeout outside recommended range (1s - 10m)");
        suggestions.push("Use timeout between 1000ms (1s) and 600000ms (10m)");
      }
    } else {
      errors.push(
        new ValidationError(
          "Timeout must be a number (ms) or string",
          "timeout",
          "INVALID_TYPE",
        ),
      );
    }
  }

  return { isValid: errors.length === 0, errors, warnings, suggestions };
}

/**
 * Validate stream options
 */
export function validateStreamOptions(
  options: unknown,
): EnhancedValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const suggestions: StringArray = [];

  if (!isNonNullObject(options)) {
    errors.push(
      new ValidationError(
        "Options must be an object",
        "options",
        "INVALID_TYPE",
      ),
    );
    return { isValid: false, errors, warnings, suggestions };
  }

  const opts = options as Partial<StreamOptions>;

  // Validate input
  if (!opts.input || !isNonNullObject(opts.input)) {
    errors.push(
      new ValidationError(
        "input is required and must be an object with text property",
        "input",
        "REQUIRED_FIELD",
        ["Provide input: { text: 'your prompt here' }"],
      ),
    );
  } else {
    const inputError = validateRequiredString(
      (opts.input as { text?: unknown }).text,
      "input.text",
      1,
    );
    if (inputError) {
      errors.push(inputError);
    }
  }

  // Validate temperature
  const tempError = validateNumberRange(opts.temperature, "temperature", 0, 2);
  if (tempError) {
    errors.push(tempError);
  }

  // Validate maxTokens
  const tokensError = validateNumberRange(
    opts.maxTokens,
    "maxTokens",
    1,
    128000,
  );
  if (tokensError) {
    errors.push(tokensError);
  }

  return { isValid: errors.length === 0, errors, warnings, suggestions };
}

/**
 * Validate generate options (unified interface)
 */
export function validateGenerateOptions(
  options: unknown,
): EnhancedValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const suggestions: StringArray = [];

  if (!isNonNullObject(options)) {
    errors.push(
      new ValidationError(
        "Options must be an object",
        "options",
        "INVALID_TYPE",
      ),
    );
    return { isValid: false, errors, warnings, suggestions };
  }

  const opts = options as Partial<GenerateOptions>;

  // Validate input
  if (!opts.input || !isNonNullObject(opts.input)) {
    errors.push(
      new ValidationError(
        "input is required and must be an object with text property",
        "input",
        "REQUIRED_FIELD",
        ["Provide input: { text: 'your prompt here' }"],
      ),
    );
  } else {
    const inputError = validateRequiredString(
      (opts.input as { text?: unknown }).text,
      "input.text",
      1,
    );
    if (inputError) {
      errors.push(inputError);
    }
  }

  // Common validation for temperature and maxTokens
  const tempError = validateNumberRange(opts.temperature, "temperature", 0, 2);
  if (tempError) {
    errors.push(tempError);
  }

  const tokensError = validateNumberRange(
    opts.maxTokens,
    "maxTokens",
    1,
    128000,
  );
  if (tokensError) {
    errors.push(tokensError);
  }

  // Validate factory config if present
  if (opts.factoryConfig && !isNonNullObject(opts.factoryConfig)) {
    warnings.push("factoryConfig should be an object if provided");
    suggestions.push(
      "Provide valid factory configuration or remove the property",
    );
  }

  return { isValid: errors.length === 0, errors, warnings, suggestions };
}

// ============================================================================
// PARAMETER TRANSFORMATION VALIDATORS
// ============================================================================

/**
 * Validate tool execution parameters
 */
export function validateToolExecutionParams(
  toolName: string,
  params: unknown,
  expectedSchema?: ValidationSchema,
): EnhancedValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const suggestions: StringArray = [];

  // Basic parameter validation
  if (params !== undefined && params !== null && !isNonNullObject(params)) {
    errors.push(
      new ValidationError(
        `Parameters for tool '${toolName}' must be an object`,
        "params",
        "INVALID_TYPE",
        ["Provide parameters as an object: { key: value, ... }"],
      ),
    );
    return { isValid: false, errors, warnings, suggestions };
  }

  // Schema validation (if provided)
  if (expectedSchema && params) {
    try {
      // This is a placeholder for actual schema validation
      // In practice, you would use Zod or JSON schema validation here
      warnings.push("Schema validation not yet implemented");
      suggestions.push("Implement Zod schema validation for tool parameters");
    } catch (error) {
      errors.push(
        new ValidationError(
          `Parameter validation failed: ${error instanceof Error ? error.message : String(error)}`,
          "params",
          "SCHEMA_VALIDATION",
          ["Check parameter format against tool schema"],
        ),
      );
    }
  }

  return { isValid: errors.length === 0, errors, warnings, suggestions };
}

// ============================================================================
// BATCH VALIDATION UTILITIES
// ============================================================================

/**
 * Validate multiple tools at once
 */
export function validateToolBatch(tools: Record<string, unknown>): {
  isValid: boolean;
  validTools: string[];
  invalidTools: string[];
  results: Record<string, EnhancedValidationResult>;
} {
  const validTools: string[] = [];
  const invalidTools: string[] = [];
  const results: Record<string, EnhancedValidationResult> = {};

  for (const [name, tool] of Object.entries(tools)) {
    const nameValidation = validateToolName(name);
    const toolValidation = validateMCPTool(tool);

    const combinedResult: EnhancedValidationResult = {
      isValid: !nameValidation && toolValidation.isValid,
      errors: nameValidation
        ? [nameValidation, ...toolValidation.errors]
        : toolValidation.errors,
      warnings: toolValidation.warnings,
      suggestions: toolValidation.suggestions,
    };

    results[name] = combinedResult;

    if (combinedResult.isValid) {
      validTools.push(name);
    } else {
      invalidTools.push(name);
    }
  }

  return {
    isValid: invalidTools.length === 0,
    validTools,
    invalidTools,
    results,
  };
}

// ============================================================================
// VIDEO GENERATION VALIDATORS
// ============================================================================

/**
 * Convert a NeuroLinkError to a ValidationError shape
 * Used to maintain consistent error types in validation results
 */
function toValidationError(error: NeuroLinkError): ValidationError {
  return new ValidationError(
    error.message,
    (error as { field?: string }).field,
    error.code,
    (error as { suggestions?: StringArray }).suggestions,
  );
}

/**
 * Valid video generation options
 */
const VALID_VIDEO_RESOLUTIONS = ["720p", "1080p"] as const;
const VALID_VIDEO_LENGTHS = [4, 6, 8] as const;
const VALID_VIDEO_ASPECT_RATIOS = ["9:16", "16:9"] as const;
const MAX_VIDEO_PROMPT_LENGTH = 500;
const MAX_VIDEO_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate video output options (resolution, length, aspect ratio, audio)
 *
 * @param options - VideoOutputOptions to validate
 * @returns NeuroLinkError if invalid, null if valid
 *
 * @example
 * ```typescript
 * const error = validateVideoOutputOptions({ resolution: "4K", length: 10 });
 * // error.code === "INVALID_VIDEO_RESOLUTION"
 * ```
 */
export function validateVideoOutputOptions(
  options: VideoOutputOptions,
): NeuroLinkError | null {
  // Validate resolution
  if (
    options.resolution &&
    !VALID_VIDEO_RESOLUTIONS.includes(
      options.resolution as (typeof VALID_VIDEO_RESOLUTIONS)[number],
    )
  ) {
    return ErrorFactory.invalidVideoResolution(options.resolution);
  }

  // Validate length
  if (
    options.length !== undefined &&
    !VALID_VIDEO_LENGTHS.includes(
      options.length as (typeof VALID_VIDEO_LENGTHS)[number],
    )
  ) {
    return ErrorFactory.invalidVideoLength(options.length);
  }

  // Validate aspect ratio
  if (
    options.aspectRatio &&
    !VALID_VIDEO_ASPECT_RATIOS.includes(
      options.aspectRatio as (typeof VALID_VIDEO_ASPECT_RATIOS)[number],
    )
  ) {
    return ErrorFactory.invalidVideoAspectRatio(options.aspectRatio);
  }

  // Validate audio (must be boolean if provided)
  if (options.audio !== undefined && typeof options.audio !== "boolean") {
    return ErrorFactory.invalidVideoAudio(options.audio);
  }

  return null;
}

/**
 * Validate image input for video generation
 *
 * Checks image format (magic bytes) and size constraints.
 * Supports JPEG, PNG, and WebP formats.
 *
 * @param image - Image buffer to validate
 * @param maxSize - Maximum allowed size in bytes (default: 10MB)
 * @returns NeuroLinkError if invalid, null if valid
 *
 * @example
 * ```typescript
 * const imageBuffer = readFileSync("product.jpg");
 * const error = validateImageForVideo(imageBuffer);
 * if (error) throw error;
 * ```
 */
export function validateImageForVideo(
  image: Buffer | string,
  maxSize: number = MAX_VIDEO_IMAGE_SIZE,
): NeuroLinkError | null {
  // Handle null/undefined
  if (image === null || image === undefined) {
    return ErrorFactory.invalidImageType();
  }

  // If string (URL or path), skip detailed validation
  if (typeof image === "string") {
    // Basic URL/path validation
    if (image.trim().length === 0) {
      return ErrorFactory.emptyImagePath();
    }
    return null;
  }

  // Ensure it's a Buffer
  if (!Buffer.isBuffer(image)) {
    return ErrorFactory.invalidImageType();
  }

  // Check size
  if (image.length > maxSize) {
    const sizeMB = (image.length / 1024 / 1024).toFixed(2);
    const maxMB = (maxSize / 1024 / 1024).toFixed(0);
    return ErrorFactory.imageTooLarge(sizeMB, maxMB);
  }

  // Check minimum size (at least a few bytes for magic number detection)
  if (image.length < 8) {
    return ErrorFactory.imageTooSmall();
  }

  // Check magic bytes for supported formats
  const isJPEG = image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
  const isPNG =
    image[0] === 0x89 &&
    image[1] === 0x50 &&
    image[2] === 0x4e &&
    image[3] === 0x47;

  // WebP requires both RIFF header AND WEBP signature
  // Check for WebP: RIFF at bytes 0-3 AND "WEBP" at bytes 8-11
  const isWebP =
    image.length >= 12 &&
    image[0] === 0x52 &&
    image[1] === 0x49 &&
    image[2] === 0x46 &&
    image[3] === 0x46 && // RIFF header
    image[8] === 0x57 &&
    image[9] === 0x45 &&
    image[10] === 0x42 &&
    image[11] === 0x50; // WEBP signature

  const isValidFormat = isJPEG || isPNG || isWebP;

  if (!isValidFormat) {
    return ErrorFactory.invalidImageFormat();
  }

  return null;
}

/**
 * Validate complete video generation input
 *
 * Validates all requirements for video generation:
 * - output.mode must be "video"
 * - Must have exactly one input image
 * - Prompt must be within length limits
 * - Video output options must be valid
 *
 * @param options - GenerateOptions to validate for video generation
 * @returns EnhancedValidationResult with errors, warnings, and suggestions
 *
 * @example
 * ```typescript
 * const validation = validateVideoGenerationInput({
 *   input: { text: "Product showcase video", images: [imageBuffer] },
 *   output: { mode: "video", video: { resolution: "1080p" } }
 * });
 * if (!validation.isValid) {
 *   console.error(validation.errors);
 * }
 * ```
 */
export function validateVideoGenerationInput(
  options: GenerateOptions,
): EnhancedValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const suggestions: StringArray = [];

  // Must have video mode
  if (options.output?.mode !== "video") {
    errors.push(toValidationError(ErrorFactory.invalidVideoMode()));
  }

  // Must have at least one image
  if (!options.input?.images || options.input.images.length === 0) {
    errors.push(toValidationError(ErrorFactory.missingVideoImage()));
  } else if (options.input.images.length > 1) {
    // Warn if multiple images provided - only first will be used
    warnings.push(
      "Only the first image will be used for video generation. Additional images will be ignored.",
    );
    suggestions.push("Provide a single image for video generation");
  }

  // Validate the first image if present
  if (options.input?.images && options.input.images.length > 0) {
    const firstImage = options.input.images[0];
    // Handle ImageWithAltText type
    const imageData =
      typeof firstImage === "object" && "data" in firstImage
        ? firstImage.data
        : firstImage;

    // Skip validation for URL/path strings, validate Buffers
    if (typeof imageData !== "string") {
      const imageError = validateImageForVideo(imageData as Buffer);
      if (imageError) {
        errors.push(toValidationError(imageError));
      }
    }
  }

  // Validate prompt/text - trim once for consistency
  const trimmedPrompt = options.input?.text?.trim() || "";
  if (trimmedPrompt.length === 0) {
    errors.push(toValidationError(ErrorFactory.emptyVideoPrompt()));
  } else if (trimmedPrompt.length > MAX_VIDEO_PROMPT_LENGTH) {
    errors.push(
      toValidationError(
        ErrorFactory.videoPromptTooLong(
          trimmedPrompt.length,
          MAX_VIDEO_PROMPT_LENGTH,
        ),
      ),
    );
  }

  // Validate video output options if provided
  if (options.output?.video) {
    const videoError = validateVideoOutputOptions(options.output.video);
    if (videoError) {
      errors.push(toValidationError(videoError));
    }
  }

  // Add helpful suggestions
  if (errors.length === 0 && warnings.length === 0) {
    suggestions.push(
      "Video generation takes 60-180 seconds. Consider setting a longer timeout.",
    );
  }

  return { isValid: errors.length === 0, errors, warnings, suggestions };
}

// ============================================================================
// PPT VALIDATION (Presentation Generation)
// ============================================================================

/**
 * Valid PPT generation options
 */
const VALID_PPT_THEMES = [
  "modern",
  "corporate",
  "creative",
  "minimal",
  "dark",
] as const;
const VALID_PPT_AUDIENCES = [
  "business",
  "students",
  "technical",
  "general",
] as const;
const VALID_PPT_TONES = [
  "professional",
  "casual",
  "educational",
  "persuasive",
] as const;
const VALID_PPT_ASPECT_RATIOS = ["16:9", "4:3"] as const;
const VALID_PPT_FORMATS = ["pptx"] as const;
export const MIN_PPT_PAGES = 5;
export const MAX_PPT_PAGES = 50;
export const MIN_PPT_PROMPT_LENGTH = 10;
export const MAX_PPT_PROMPT_LENGTH = 1000;

/**
 * Validate PPT output options (pages, theme, audience, tone, etc.)
 *
 * @param options - PPTOutputOptions to validate
 * @returns NeuroLinkError if invalid, null if valid
 *
 * @example
 * ```typescript
 * const error = validatePPTOutputOptions({ pages: 100, theme: "invalid" });
 * // error.code === "INVALID_PPT_PAGES"
 * ```
 */
export function validatePPTOutputOptions(
  options: PPTOutputOptions,
): NeuroLinkError | null {
  // Validate pages (slide count) - REQUIRED FIELD
  if (options.pages === undefined || options.pages === null) {
    return ErrorFactory.missingPPTProperty("output.ppt.pages", [
      "Provide the number of slides: output.ppt.pages = 10",
      "Valid range: 5 to 50 slides",
      "Recommended: 10 slides for most presentations",
    ]);
  }

  if (typeof options.pages !== "number") {
    return ErrorFactory.invalidPPTPages(options.pages, "not a number");
  }

  if (!Number.isInteger(options.pages)) {
    return ErrorFactory.invalidPPTPages(options.pages, "not an integer");
  }

  if (options.pages < MIN_PPT_PAGES || options.pages > MAX_PPT_PAGES) {
    return ErrorFactory.invalidPPTPages(
      options.pages,
      `out of range (${MIN_PPT_PAGES}-${MAX_PPT_PAGES})`,
    );
  }

  // Validate format
  if (
    options.format !== undefined &&
    !VALID_PPT_FORMATS.includes(options.format)
  ) {
    return ErrorFactory.invalidPPTFormat(options.format);
  }

  // Validate theme
  if (
    options.theme !== undefined &&
    !VALID_PPT_THEMES.includes(options.theme)
  ) {
    return ErrorFactory.invalidPPTOutputOptions(
      "theme",
      options.theme,
      Array.from(VALID_PPT_THEMES),
    );
  }

  // Validate audience
  if (
    options.audience !== undefined &&
    !VALID_PPT_AUDIENCES.includes(options.audience)
  ) {
    return ErrorFactory.invalidPPTOutputOptions(
      "audience",
      options.audience,
      Array.from(VALID_PPT_AUDIENCES),
    );
  }

  // Validate tone
  if (options.tone !== undefined && !VALID_PPT_TONES.includes(options.tone)) {
    return ErrorFactory.invalidPPTOutputOptions(
      "tone",
      options.tone,
      Array.from(VALID_PPT_TONES),
    );
  }

  // Validate aspectRatio
  if (
    options.aspectRatio !== undefined &&
    !VALID_PPT_ASPECT_RATIOS.includes(options.aspectRatio)
  ) {
    return ErrorFactory.invalidPPTOutputOptions(
      "aspectRatio",
      options.aspectRatio,
      Array.from(VALID_PPT_ASPECT_RATIOS),
    );
  }

  // Validate includeImages (must be boolean if provided)
  if (
    options.includeImages !== undefined &&
    typeof options.includeImages !== "boolean"
  ) {
    return ErrorFactory.invalidPPTOutputOptions(
      "includeImages",
      options.includeImages,
      ["true", "false"],
    );
  }

  // Validate logoPath (string path, Buffer, or ImageWithAltText)
  if (options.logoPath !== undefined) {
    if (typeof options.logoPath === "string") {
      if (options.logoPath.trim().length === 0) {
        return ErrorFactory.invalidPPTLogoPath(
          options.logoPath,
          "empty string",
        );
      }
    } else if (Buffer.isBuffer(options.logoPath)) {
      // ok
    } else if (
      typeof options.logoPath === "object" &&
      "data" in options.logoPath
    ) {
      const data = (options.logoPath as { data: unknown }).data;
      if (typeof data === "string") {
        if (data.trim().length === 0) {
          return ErrorFactory.invalidPPTLogoPath(
            options.logoPath,
            "empty string",
          );
        }
      } else if (!Buffer.isBuffer(data)) {
        return ErrorFactory.invalidPPTLogoPath(
          options.logoPath,
          "invalid data type",
        );
      }
    } else {
      return ErrorFactory.invalidPPTLogoPath(options.logoPath, "invalid type");
    }
  }

  // Validate outputPath (must be non-empty string if provided)
  if (options.outputPath !== undefined) {
    if (typeof options.outputPath !== "string") {
      return ErrorFactory.invalidPPTOutputPath(
        options.outputPath,
        "not a string",
      );
    }
    if (options.outputPath.trim().length === 0) {
      return ErrorFactory.invalidPPTOutputPath(
        options.outputPath,
        "empty string",
      );
    }
  }

  return null;
}

function validatePPTProvider(
  provider: AIProviderName | string,
): NeuroLinkError | null {
  // PPT generation supported providers (subset of all AIProviderName values)
  // Supports major LLM providers with structured output capabilities
  const validProviders = [
    "vertex",
    "openai",
    "azure",
    "anthropic",
    "google-ai",
    "bedrock",
  ];

  // Convert enum or string to lowercase string for comparison
  const providerString = String(provider).toLowerCase();

  if (!validProviders.includes(providerString)) {
    return ErrorFactory.invalidPPTProvider(provider);
  }

  return null;
}

/**
 * Validate complete PPT generation input
 *
 * Validates all requirements for presentation generation:
 * - output.mode must be "ppt"
 * - Prompt must be within length limits
 * - PPT output options must be valid
 *
 * @param options - GenerateOptions to validate for PPT generation
 * @returns EnhancedValidationResult with errors, warnings, and suggestions
 *
 * @example
 * ```typescript
 * const validation = validatePPTGenerationInput({
 *   input: { text: "Introducing Our New Product" },
 *   output: { mode: "ppt", ppt: { pages: 10, theme: "modern" } }
 * });
 * if (!validation.isValid) {
 *   console.error(validation.errors);
 * }
 * ```
 */
export function validatePPTGenerationInput(
  options: GenerateOptions,
): EnhancedValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const suggestions: StringArray = [];

  // Validate prompt/text - trim once for consistency
  const trimmedPrompt = options.input.text.trim();
  if (trimmedPrompt === "") {
    errors.push(
      toValidationError(ErrorFactory.invalidPPTPrompt("empty prompt")),
    );
  } else if (trimmedPrompt.length < MIN_PPT_PROMPT_LENGTH) {
    errors.push(
      toValidationError(
        ErrorFactory.invalidPPTPrompt(
          `prompt too short (${trimmedPrompt.length} characters, min ${MIN_PPT_PROMPT_LENGTH})`,
        ),
      ),
    );
  } else if (trimmedPrompt.length > MAX_PPT_PROMPT_LENGTH) {
    errors.push(
      toValidationError(
        ErrorFactory.invalidPPTPrompt(
          `prompt too long (${trimmedPrompt.length} characters, max ${MAX_PPT_PROMPT_LENGTH})`,
        ),
      ),
    );
  }

  // image PPT options if provided
  if (options.input.images && options.input.images.length > 0) {
    warnings.push(
      "Images can be unused in PPT generation due to fail in quality standards and can lead to longer generation times.",
    );
    suggestions.push(
      "Only provide high-quality, relevant images for PPT generation.",
    );
  }

  // Validate provider (optional - only validate if explicitly provided)
  if (options.provider !== undefined) {
    const providerError = validatePPTProvider(options.provider);
    if (providerError) {
      errors.push(toValidationError(providerError));
    }
  }

  // Mode is optional, but if provided must be "ppt"
  if (options.output?.mode !== undefined && options.output.mode !== "ppt") {
    errors.push(toValidationError(ErrorFactory.invalidPPTMode()));
  }

  // Validate PPT output options
  if (options.output?.ppt) {
    const pptError = validatePPTOutputOptions(options.output.ppt);
    if (pptError) {
      errors.push(toValidationError(pptError));
    }

    // Add specific warnings
    const pages = options.output.ppt.pages;
    if (pages > 30) {
      warnings.push(
        `Generating ${pages} slides may take significant time (estimated: ${Math.ceil(pages * 3)}-${Math.ceil(pages * 5)} seconds)`,
      );
    }

    if (
      options.output.ppt.includeImages === undefined ||
      options.output.ppt.includeImages === true
    ) {
      suggestions.push(
        "Image generation is enabled. Each slide with images will take additional time (~2-5 seconds per image).",
      );
    }
  } else {
    errors.push(
      toValidationError(
        ErrorFactory.missingPPTProperty("output.ppt", [
          "Provide PPT generation options under output.ppt",
          "Specify number of slides, theme, and other preferences",
        ]),
      ),
    );
  }

  // Add helpful suggestions
  if (errors.length === 0 && warnings.length === 0) {
    suggestions.push(
      "PPT generation typically takes 30-120 seconds depending on slide count and image generation.",
    );
  }

  return { isValid: errors.length === 0, errors, warnings, suggestions };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a validation error summary for logging
 */
export function createValidationSummary(
  result: EnhancedValidationResult,
): string {
  const parts: string[] = [];

  if (result.errors.length > 0) {
    parts.push(`Errors: ${result.errors.map((e) => e.message).join("; ")}`);
  }

  if (result.warnings.length > 0) {
    parts.push(`Warnings: ${result.warnings.join("; ")}`);
  }

  if (result.suggestions.length > 0) {
    parts.push(`Suggestions: ${result.suggestions.join("; ")}`);
  }

  return parts.join(" | ");
}

/**
 * Check if validation result has only warnings (no errors)
 */
export function hasOnlyWarnings(result: EnhancedValidationResult): boolean {
  return result.errors.length === 0 && result.warnings.length > 0;
}
