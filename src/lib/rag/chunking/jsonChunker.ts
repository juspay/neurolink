/**
 * JSON-aware Chunker
 *
 * Splits JSON documents based on structure (arrays, objects, keys).
 * Best for API responses, configuration files, and structured data.
 */

import { randomUUID } from "crypto";
import type {
  Chunker,
  Chunk,
  ChunkerValidationResult,
  JSONChunkerConfig,
  BaseChunkerConfig,
} from "../types.js";

/**
 * Options for extractChunks method
 */
type ExtractChunksOptions = {
  data: unknown;
  path: string;
  depth: number;
  maxDepth: number;
  maxSize: number;
  splitKeys: string[];
  preserveKeys: string[];
  includeJsonPath: boolean;
};

/**
 * JSON-aware chunker implementation
 * Splits based on JSON structure
 */
export class JSONChunker implements Chunker {
  readonly strategy = "json" as const;

  async chunk(text: string, config?: JSONChunkerConfig): Promise<Chunk[]> {
    const {
      maxSize = 1000,
      maxDepth = 10,
      splitKeys = [],
      preserveKeys = [],
      includeJsonPath = true,
      trimWhitespace = true,
      metadata = {},
    } = config || {};

    const documentId = randomUUID();
    const chunks: Chunk[] = [];

    if (!text || text.length === 0) {
      return chunks;
    }

    // Parse JSON
    let jsonData: unknown;
    try {
      jsonData = JSON.parse(text);
    } catch {
      // If not valid JSON, treat as plain text
      chunks.push({
        id: randomUUID(),
        text: trimWhitespace ? text.trim() : text,
        metadata: {
          documentId,
          chunkIndex: 0,
          totalChunks: 1,
          startPosition: 0,
          endPosition: text.length,
          documentType: "json",
          custom: {
            ...metadata,
            parseError: "Invalid JSON",
          },
        },
      });
      return chunks;
    }

    // Extract chunks from JSON structure
    const extractedChunks = this.extractChunks({
      data: jsonData,
      path: "",
      depth: 0,
      maxDepth,
      maxSize,
      splitKeys,
      preserveKeys,
      includeJsonPath,
    });

    // Convert to Chunk objects
    let chunkIndex = 0;
    let currentPosition = 0;

    for (const extracted of extractedChunks) {
      const chunkText = JSON.stringify(extracted.value, null, 2);
      const finalText = trimWhitespace ? chunkText.trim() : chunkText;

      if (finalText.length > 0) {
        const chunkMetadata: Record<string, unknown> = {
          ...metadata,
        };

        if (includeJsonPath && extracted.path) {
          chunkMetadata.jsonPath = extracted.path;
        }

        chunks.push({
          id: randomUUID(),
          text: finalText,
          metadata: {
            documentId,
            chunkIndex,
            startPosition: currentPosition,
            endPosition: currentPosition + finalText.length,
            documentType: "json",
            jsonPath: extracted.path,
            custom: chunkMetadata,
          },
        });
        chunkIndex++;
        currentPosition += finalText.length;
      }
    }

    // Update total chunks count
    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * Recursively extract chunks from JSON structure
   */
  private extractChunks(
    options: ExtractChunksOptions,
  ): Array<{ value: unknown; path: string }> {
    const {
      data,
      path,
      depth,
      maxDepth,
      maxSize,
      splitKeys,
      preserveKeys,
      includeJsonPath,
    } = options;
    const results: Array<{ value: unknown; path: string }> = [];

    // Check depth limit
    if (depth > maxDepth) {
      results.push({ value: data, path });
      return results;
    }

    // Check if this should be preserved as a unit
    const currentKey = path.split(".").pop() || "";
    if (preserveKeys.includes(currentKey)) {
      results.push({ value: data, path });
      return results;
    }

    // Check size - if small enough, keep as one chunk
    const serialized = JSON.stringify(data, null, 2);
    if (serialized.length <= maxSize) {
      results.push({ value: data, path });
      return results;
    }

    // Handle arrays
    if (Array.isArray(data)) {
      // Check if array should be split by index
      if (splitKeys.length === 0 || splitKeys.some((k) => path.endsWith(k))) {
        // Split array into individual elements or groups
        let currentGroup: unknown[] = [];
        let currentGroupSize = 0;

        for (let i = 0; i < data.length; i++) {
          const item = data[i];
          const itemSize = JSON.stringify(item, null, 2).length;

          if (
            currentGroupSize + itemSize > maxSize &&
            currentGroup.length > 0
          ) {
            // Save current group
            results.push({
              value: currentGroup.length === 1 ? currentGroup[0] : currentGroup,
              path: `${path}[${i - currentGroup.length}:${i}]`,
            });
            currentGroup = [];
            currentGroupSize = 0;
          }

          // If single item is too large, recursively split it
          if (itemSize > maxSize) {
            const subChunks = this.extractChunks({
              data: item,
              path: `${path}[${i}]`,
              depth: depth + 1,
              maxDepth,
              maxSize,
              splitKeys,
              preserveKeys,
              includeJsonPath,
            });
            results.push(...subChunks);
          } else {
            currentGroup.push(item);
            currentGroupSize += itemSize;
          }
        }

        // Don't forget the last group
        if (currentGroup.length > 0) {
          results.push({
            value: currentGroup.length === 1 ? currentGroup[0] : currentGroup,
            path: `${path}[${data.length - currentGroup.length}:${data.length}]`,
          });
        }
      } else {
        // Keep array as one unit but may need to truncate
        results.push({ value: data, path });
      }
    }
    // Handle objects
    else if (data !== null && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const keys = Object.keys(obj);

      // Check if any keys should be split
      const keysToSplit = keys.filter(
        (k) => splitKeys.length === 0 || splitKeys.includes(k),
      );

      if (keysToSplit.length > 0) {
        let currentObj: Record<string, unknown> = {};
        let currentObjSize = 0;

        for (const key of keys) {
          const value = obj[key];
          const valueSize = JSON.stringify({ [key]: value }, null, 2).length;

          // Check if this key should be split out
          if (splitKeys.includes(key)) {
            // Save current object first if it has content
            if (Object.keys(currentObj).length > 0) {
              results.push({
                value: currentObj,
                path: path,
              });
              currentObj = {};
              currentObjSize = 0;
            }

            // Recursively process this value
            const subChunks = this.extractChunks({
              data: value,
              path: path ? `${path}.${key}` : key,
              depth: depth + 1,
              maxDepth,
              maxSize,
              splitKeys,
              preserveKeys,
              includeJsonPath,
            });
            results.push(...subChunks);
          } else if (
            currentObjSize + valueSize > maxSize &&
            Object.keys(currentObj).length > 0
          ) {
            // Save current object
            results.push({
              value: currentObj,
              path: path,
            });
            currentObj = { [key]: value };
            currentObjSize = valueSize;
          } else {
            currentObj[key] = value;
            currentObjSize += valueSize;
          }
        }

        // Don't forget the last object
        if (Object.keys(currentObj).length > 0) {
          results.push({
            value: currentObj,
            path: path,
          });
        }
      } else {
        // Process each key individually
        for (const key of keys) {
          const value = obj[key];
          const keyPath = path ? `${path}.${key}` : key;
          const valueSize = JSON.stringify(value, null, 2).length;

          if (valueSize > maxSize) {
            // Recursively split
            const subChunks = this.extractChunks({
              data: value,
              path: keyPath,
              depth: depth + 1,
              maxDepth,
              maxSize,
              splitKeys,
              preserveKeys,
              includeJsonPath,
            });
            results.push(...subChunks);
          } else {
            results.push({
              value: { [key]: value },
              path: keyPath,
            });
          }
        }
      }
    }
    // Primitive values
    else {
      results.push({ value: data, path });
    }

    return results;
  }

  validateConfig(config: BaseChunkerConfig): ChunkerValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const jsonConfig = config as JSONChunkerConfig;

    if (jsonConfig.maxSize !== undefined && jsonConfig.maxSize <= 0) {
      errors.push("maxSize must be greater than 0");
    }

    if (jsonConfig.maxDepth !== undefined && jsonConfig.maxDepth < 1) {
      errors.push("maxDepth must be at least 1");
    }

    if (jsonConfig.maxDepth !== undefined && jsonConfig.maxDepth > 100) {
      warnings.push("Very high maxDepth may cause performance issues");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
