/**
 * Structured Output Streaming Parser (Phase 2.3)
 *
 * This module provides partial JSON parsing for streaming structured output
 * responses from SageMaker endpoints with real-time validation.
 */

import type { SageMakerStructuredOutput } from "../../types/providers.js";
import { logger } from "../../utils/logger.js";
import {
  type BracketCountingState,
  processBracketCharacter,
} from "./parsers.js";

/**
 * Partial JSON parser for streaming structured output
 */
export class StructuredOutputParser {
  private buffer = "";
  private currentObject: Record<string, unknown> = {};
  private currentPath: string[] = [];
  private schema?: Record<string, unknown>;
  // Removed bracketStack: Redundant with bracketTypeStack, causes O(n) memory usage
  private inString = false;
  private escapeNext = false;
  // Efficient bracket counting using counters instead of array operations
  private bracketCount = 0;
  private arrayBracketCount = 0;
  private lastProcessedLength = 0;
  private lastKeyValueParsePosition = 0; // Track position in key-value parsing to prevent O(n²)

  // Simple string-based bracket tracking for better readability
  private bracketTypeStack: string[] = []; // Stack of bracket types: '{' or '['

  constructor(schema?: Record<string, unknown>) {
    this.schema = schema;
  }

  /**
   * Parse a chunk of JSON text and return structured output info
   */
  parseChunk(chunk: string): SageMakerStructuredOutput {
    this.buffer += chunk;

    // Process bracket structure to update our state first
    const partialResult = this.parsePartialJSON(chunk);

    // Use efficient bracket counting to check completeness before expensive JSON.parse
    if (this.isObjectComplete() && this.buffer.trim().length > 0) {
      try {
        // Only attempt JSON.parse when bracket counting indicates completeness
        const completeObject = JSON.parse(this.buffer);

        // If successful, it's complete
        return {
          partialObject: completeObject,
          jsonDelta: chunk,
          currentPath: this.currentPath.join("."),
          complete: true,
          schema: this.schema,
          validationErrors: this.validateAgainstSchema(completeObject),
        };
      } catch {
        // JSON.parse failed despite bracket completeness - treat as partial
        return {
          partialObject: this.currentObject,
          jsonDelta: chunk,
          currentPath: this.currentPath.join("."),
          complete: false,
          schema: this.schema,
          validationErrors: this.validatePartialObject(),
          ...partialResult,
        };
      }
    } else {
      // JSON is incomplete based on bracket counting - avoid expensive JSON.parse
      return {
        partialObject: this.currentObject,
        jsonDelta: chunk,
        currentPath: this.currentPath.join("."),
        complete: false,
        schema: this.schema,
        validationErrors: this.validatePartialObject(),
        ...partialResult,
      };
    }
  }

  /**
   * Parse partial JSON by tracking structure with consolidated bracket counting
   */
  private parsePartialJSON(chunk: string): Partial<SageMakerStructuredOutput> {
    // Use consolidated bracket tracking for both counting and path navigation
    this.processBracketStructure(chunk);

    // Try to extract partial object from valid JSON fragments
    this.extractPartialObject();

    return {};
  }

  /**
   * Consolidated bracket structure processing - handles both counting and path navigation
   * Uses shared bracket counting logic to reduce code duplication
   */
  private processBracketStructure(chunk: string): void {
    // Create a state object compatible with the shared bracket counting logic
    const sharedState: BracketCountingState = {
      braceCount: this.bracketCount,
      bracketCount: this.arrayBracketCount,
      inString: this.inString,
      escapeNext: this.escapeNext,
    };

    for (let i = 0; i < chunk.length; i++) {
      const char = chunk[i];

      // Use shared bracket counting logic for core functionality
      const result = processBracketCharacter(char, sharedState);
      if (!result.isValid) {
        logger.debug("Invalid bracket structure detected", {
          reason: result.reason,
          position: i,
          char,
        });
        continue;
      }

      // Handle path navigation and stack management (parser-specific logic)
      if (!sharedState.inString) {
        switch (char) {
          case "{":
            this.bracketTypeStack.push("{");
            break;
          case "}":
            // Check for matching opening brace
            if (
              this.bracketTypeStack.length > 0 &&
              this.bracketTypeStack[this.bracketTypeStack.length - 1] === "{"
            ) {
              this.bracketTypeStack.pop();
              if (this.currentPath.length > 0) {
                this.currentPath.pop();
              }
            }
            break;
          case "[":
            this.bracketTypeStack.push("[");
            break;
          case "]":
            // Check for matching opening bracket
            if (
              this.bracketTypeStack.length > 0 &&
              this.bracketTypeStack[this.bracketTypeStack.length - 1] === "["
            ) {
              this.bracketTypeStack.pop();
            }
            break;
          case ":":
            // Entering a value
            break;
          case ",":
            // Moving to next property
            if (this.currentPath.length > 0) {
              this.currentPath.pop();
            }
            break;
        }
      }
    }

    // Update instance state from shared state
    this.bracketCount = sharedState.braceCount;
    this.arrayBracketCount = sharedState.bracketCount;
    this.inString = sharedState.inString;
    this.escapeNext = sharedState.escapeNext;
    this.lastProcessedLength = this.buffer.length;
  }

  /**
   * Extract partial object from buffer by finding valid JSON fragments
   * Optimized for large JSON strings using true incremental parsing to prevent O(n²) performance
   */
  private extractPartialObject(): void {
    try {
      // Only process new content since last parse to avoid O(n²) performance
      const newContentStart = this.lastKeyValueParsePosition;
      const newContentLength = this.buffer.length - newContentStart;

      // Skip processing if no new content
      if (newContentLength <= 0) {
        return;
      }

      const tempObject: Record<string, unknown> = {};

      // Use incremental parsing that only processes new content
      this.parseKeyValuePairsIncrementally(this.buffer, tempObject);

      // Update current object with new properties
      Object.assign(this.currentObject, tempObject);
    } catch (error) {
      logger.debug("Error extracting partial object", {
        error: error instanceof Error ? error.message : String(error),
        buffer: this.buffer.substring(0, 100),
        lastProcessedLength: this.lastProcessedLength,
        newContentStart: this.lastKeyValueParsePosition,
        bufferLength: this.buffer.length,
      });
    }
  }

  /**
   * Efficiently parse key-value pairs from JSON buffer using true incremental approach
   * Optimized for large JSON strings to avoid O(n²) performance by only processing new content
   */
  private parseKeyValuePairsIncrementally(
    buffer: string,
    targetObject: Record<string, unknown>,
  ): void {
    // Start from where we left off in key-value parsing to avoid reprocessing
    let i = Math.max(0, this.lastKeyValueParsePosition);
    const length = buffer.length;

    // If no new content to parse, return early
    if (i >= length) {
      return;
    }

    // Track if we're in the middle of parsing a key-value pair
    let parsingState:
      | "seeking_key"
      | "seeking_colon"
      | "seeking_value"
      | "parsing_value" = "seeking_key";
    let currentKey: string | null = null;

    while (i < length) {
      // Skip whitespace - optimized character check instead of regex for performance
      while (i < length && this.isWhitespace(buffer[i])) {
        i++;
      }

      if (i >= length) {
        break;
      }

      switch (parsingState) {
        case "seeking_key":
          // Look for opening quote of key
          if (buffer[i] === '"') {
            const keyResult = this.parseQuotedString(buffer, i);
            if (!keyResult) {
              // Incomplete key, save position and exit
              this.lastKeyValueParsePosition = i;
              return;
            }
            currentKey = keyResult.value;
            i = keyResult.endIndex + 1;
            parsingState = "seeking_colon";
          } else if (buffer[i] === "{" || buffer[i] === "[") {
            // Skip nested objects/arrays for now - they need separate handling
            i++;
          } else {
            i++;
          }
          break;

        case "seeking_colon":
          if (buffer[i] === ":") {
            i++;
            parsingState = "seeking_value";
          } else if (!this.isWhitespace(buffer[i])) {
            // Invalid character, reset state
            parsingState = "seeking_key";
            currentKey = null;
            i++;
          } else {
            i++;
          }
          break;

        case "seeking_value": {
          // Parse value
          const valueResult = this.parseJsonValue(buffer, i);
          if (valueResult && currentKey) {
            targetObject[currentKey] = valueResult.value;
            i = valueResult.endIndex + 1;
            parsingState = "seeking_key";
            currentKey = null;
          } else {
            // Incomplete value, save position for next chunk
            this.lastKeyValueParsePosition = i;
            return;
          }
          break;
        }

        default:
          i++;
      }
    }

    // Update the position we've processed to avoid reprocessing in future calls
    this.lastKeyValueParsePosition = i;
  }

  /**
   * Parse a quoted string from buffer starting at given index
   */
  private parseQuotedString(
    buffer: string,
    startIndex: number,
  ): { value: string; endIndex: number } | null {
    if (buffer[startIndex] !== '"') {
      return null;
    }

    let i = startIndex + 1;
    let result = "";

    while (i < buffer.length) {
      const char = buffer[i];

      if (char === '"') {
        return { value: result, endIndex: i };
      } else if (char === "\\" && i + 1 < buffer.length) {
        // Handle escaped characters
        const nextChar = buffer[i + 1];
        switch (nextChar) {
          case '"':
          case "\\":
          case "/":
            result += nextChar;
            break;
          case "b":
            result += "\b";
            break;
          case "f":
            result += "\f";
            break;
          case "n":
            result += "\n";
            break;
          case "r":
            result += "\r";
            break;
          case "t":
            result += "\t";
            break;
          case "u":
            // Unicode escape - simplified handling with optimized validation
            if (i + 5 < buffer.length) {
              const unicodeStr = buffer.substring(i + 2, i + 6);
              if (this.isValidHexString(unicodeStr)) {
                result += String.fromCharCode(parseInt(unicodeStr, 16));
                i += 4; // Skip additional unicode chars
              } else {
                result += nextChar; // Fallback
              }
            } else {
              result += nextChar; // Fallback
            }
            break;
          default:
            result += nextChar;
        }
        i += 2;
      } else {
        result += char;
        i++;
      }
    }

    // Unterminated string - return partial for streaming
    return { value: result, endIndex: i - 1 };
  }

  /**
   * Parse a JSON value (string, number, boolean, null) from buffer
   */
  private parseJsonValue(
    buffer: string,
    startIndex: number,
  ): { value: unknown; endIndex: number } | null {
    const char = buffer[startIndex];

    if (char === '"') {
      // String value
      const stringResult = this.parseQuotedString(buffer, startIndex);
      if (stringResult) {
        return { value: stringResult.value, endIndex: stringResult.endIndex };
      }
    } else if (
      char === "t" &&
      buffer.substring(startIndex, startIndex + 4) === "true"
    ) {
      return { value: true, endIndex: startIndex + 3 };
    } else if (
      char === "f" &&
      buffer.substring(startIndex, startIndex + 5) === "false"
    ) {
      return { value: false, endIndex: startIndex + 4 };
    } else if (
      char === "n" &&
      buffer.substring(startIndex, startIndex + 4) === "null"
    ) {
      return { value: null, endIndex: startIndex + 3 };
    } else if (char === "-" || this.isDigit(char)) {
      // Number value
      const numberResult = this.parseNumber(buffer, startIndex);
      if (numberResult) {
        return numberResult;
      }
    }

    return null;
  }

  /**
   * Parse a number from buffer starting at given index
   */
  private parseNumber(
    buffer: string,
    startIndex: number,
  ): { value: number; endIndex: number } | null {
    let i = startIndex;
    let numberStr = "";

    // Handle negative sign
    if (buffer[i] === "-") {
      numberStr += "-";
      i++;
    }

    // Parse integer part
    if (i >= buffer.length || !this.isDigit(buffer[i])) {
      return null;
    }

    while (i < buffer.length && this.isDigit(buffer[i])) {
      numberStr += buffer[i];
      i++;
    }

    // Parse decimal part
    if (i < buffer.length && buffer[i] === ".") {
      numberStr += ".";
      i++;

      if (i >= buffer.length || !this.isDigit(buffer[i])) {
        return null; // Invalid decimal
      }

      while (i < buffer.length && this.isDigit(buffer[i])) {
        numberStr += buffer[i];
        i++;
      }
    }

    // Parse exponent part
    if (i < buffer.length && (buffer[i] === "e" || buffer[i] === "E")) {
      numberStr += buffer[i];
      i++;

      if (i < buffer.length && (buffer[i] === "+" || buffer[i] === "-")) {
        numberStr += buffer[i];
        i++;
      }

      if (i >= buffer.length || !this.isDigit(buffer[i])) {
        return null; // Invalid exponent
      }

      while (i < buffer.length && this.isDigit(buffer[i])) {
        numberStr += buffer[i];
        i++;
      }
    }

    const parsedNumber = parseFloat(numberStr);
    if (isNaN(parsedNumber)) {
      return null;
    }

    return { value: parsedNumber, endIndex: i - 1 };
  }

  /**
   * Validate partial object against schema
   */
  private validatePartialObject(): string[] {
    if (!this.schema) {
      return [];
    }

    const errors: string[] = [];

    try {
      // Basic schema validation for partial objects
      const schemaProperties = this.schema.properties as Record<
        string,
        Record<string, unknown>
      >;
      const required = (this.schema.required as string[]) || [];

      if (schemaProperties) {
        for (const [key, value] of Object.entries(this.currentObject)) {
          const propertySchema = schemaProperties[key];
          if (propertySchema) {
            const validationError = this.validateProperty(
              key,
              value,
              propertySchema,
            );
            if (validationError) {
              errors.push(validationError);
            }
          }
        }
      }

      // Check for missing required properties (only for complete objects)
      if (this.isObjectComplete()) {
        for (const requiredProp of required) {
          if (!(requiredProp in this.currentObject)) {
            errors.push(`Missing required property: ${requiredProp}`);
          }
        }
      }
    } catch (error) {
      errors.push(
        `Schema validation error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return errors;
  }

  /**
   * Validate complete object against schema
   */
  private validateAgainstSchema(obj: Record<string, unknown>): string[] {
    if (!this.schema) {
      return [];
    }

    const errors: string[] = [];

    try {
      const schemaProperties = this.schema.properties as Record<
        string,
        Record<string, unknown>
      >;
      const required = (this.schema.required as string[]) || [];

      if (schemaProperties) {
        for (const [key, value] of Object.entries(obj)) {
          const propertySchema = schemaProperties[key];
          if (propertySchema) {
            const validationError = this.validateProperty(
              key,
              value,
              propertySchema,
            );
            if (validationError) {
              errors.push(validationError);
            }
          }
        }
      }

      // Check required properties
      for (const requiredProp of required) {
        if (!(requiredProp in obj)) {
          errors.push(`Missing required property: ${requiredProp}`);
        }
      }
    } catch (error) {
      errors.push(
        `Schema validation error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return errors;
  }

  /**
   * Validate a single property against its schema
   */
  private validateProperty(
    key: string,
    value: unknown,
    propertySchema: Record<string, unknown>,
  ): string | null {
    const expectedType = propertySchema.type;
    const actualType = typeof value;

    if (expectedType && actualType !== expectedType) {
      return `Property ${key}: expected ${expectedType}, got ${actualType}`;
    }

    // Additional validations
    if (
      expectedType === "string" &&
      typeof propertySchema.minLength === "number" &&
      typeof value === "string" &&
      value.length < propertySchema.minLength
    ) {
      return `Property ${key}: string too short (min ${propertySchema.minLength})`;
    }

    if (
      expectedType === "string" &&
      typeof propertySchema.maxLength === "number" &&
      typeof value === "string" &&
      value.length > propertySchema.maxLength
    ) {
      return `Property ${key}: string too long (max ${propertySchema.maxLength})`;
    }

    if (
      expectedType === "number" &&
      typeof propertySchema.minimum === "number" &&
      typeof value === "number" &&
      value < propertySchema.minimum
    ) {
      return `Property ${key}: value too small (min ${propertySchema.minimum})`;
    }

    if (
      expectedType === "number" &&
      typeof propertySchema.maximum === "number" &&
      typeof value === "number" &&
      value > propertySchema.maximum
    ) {
      return `Property ${key}: value too large (max ${propertySchema.maximum})`;
    }

    return null;
  }

  /**
   * Check if the current object appears to be complete using efficient bracket counting
   */
  private isObjectComplete(): boolean {
    // Use efficient bracket counters instead of array length for better performance
    return (
      this.bracketCount === 0 && this.arrayBracketCount === 0 && !this.inString
    );
  }

  /**
   * Optimized whitespace check to replace regex for performance with large strings
   */
  private isWhitespace(char: string): boolean {
    // Common whitespace characters: space, tab, newline, carriage return
    return char === " " || char === "\t" || char === "\n" || char === "\r";
  }

  /**
   * Optimized digit check to replace regex for performance with large strings
   */
  private isDigit(char: string): boolean {
    // Check if character is between '0' and '9'
    return char >= "0" && char <= "9";
  }

  /**
   * Optimized hex string validation to replace regex for unicode escape sequences
   */
  private isValidHexString(str: string): boolean {
    if (str.length !== 4) {
      return false;
    }

    for (let i = 0; i < 4; i++) {
      const char = str[i];
      if (
        !(
          (char >= "0" && char <= "9") ||
          (char >= "a" && char <= "f") ||
          (char >= "A" && char <= "F")
        )
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.buffer = "";
    this.currentObject = {};
    this.currentPath = [];
    this.inString = false;
    this.escapeNext = false;
    // Reset efficient bracket counters and parsing position trackers
    this.bracketCount = 0;
    this.arrayBracketCount = 0;
    this.lastProcessedLength = 0;
    this.lastKeyValueParsePosition = 0;
    this.bracketTypeStack = [];
  }

  /**
   * Get current parsing state for debugging
   */
  getState(): {
    bufferLength: number;
    currentPath: string[];
    inString: boolean;
    objectKeys: string[];
    bracketCount: number;
    arrayBracketCount: number;
    lastProcessedLength: number;
    lastKeyValueParsePosition: number;
    bracketTypeStack: string[];
  } {
    return {
      bufferLength: this.buffer.length,
      currentPath: [...this.currentPath],
      inString: this.inString,
      objectKeys: Object.keys(this.currentObject),
      bracketCount: this.bracketCount,
      arrayBracketCount: this.arrayBracketCount,
      lastProcessedLength: this.lastProcessedLength,
      lastKeyValueParsePosition: this.lastKeyValueParsePosition,
      bracketTypeStack: [...this.bracketTypeStack],
    };
  }
}

/**
 * Factory function to create structured output parser
 */
export function createStructuredOutputParser(
  schema?: Record<string, unknown>,
): StructuredOutputParser {
  return new StructuredOutputParser(schema);
}

/**
 * Utility function to detect if content is structured JSON
 */
export function isStructuredContent(content: string): boolean {
  const trimmed = content.trim();
  return (
    trimmed.startsWith("{") || (trimmed.includes('"') && trimmed.includes(":"))
  );
}

/**
 * Utility function to extract JSON schema from response format
 */
export function extractSchemaFromResponseFormat(
  responseFormat: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (responseFormat.type === "json_schema" && responseFormat.json_schema) {
    const schemaObj = responseFormat.json_schema as Record<string, unknown>;
    return schemaObj.schema as Record<string, unknown>;
  }

  if (responseFormat.type === "json_object" && responseFormat.schema) {
    return responseFormat.schema as Record<string, unknown>;
  }

  return undefined;
}
