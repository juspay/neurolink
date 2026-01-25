/**
 * Registry Parsers
 *
 * Parses different registry response formats into unified GatewayModelInfo format.
 */

import { logger } from "../utils/logger.js";
import type {
  GatewayCapabilities,
  GatewayModelInfo,
  ModelsDevResponse,
  OpenRouterModelsResponse,
} from "./types.js";

/**
 * Default capabilities when not specified
 */
const DEFAULT_CAPABILITIES: GatewayCapabilities = {
  chat: true,
  completion: true,
  embedding: false,
  imageInput: false,
  imageOutput: false,
  audioInput: false,
  audioOutput: false,
  videoInput: false,
  videoOutput: false,
  functionCalling: false,
  jsonMode: false,
  streaming: true,
};

/**
 * Parse models.dev API response
 *
 * @param data - Raw response from models.dev API
 * @returns Array of parsed model info
 */
export function parseModelsDevResponse(data: unknown): GatewayModelInfo[] {
  try {
    const response = data as ModelsDevResponse;

    if (!response?.models || !Array.isArray(response.models)) {
      logger.warn("Invalid models.dev response: missing models array");
      return [];
    }

    return response.models
      .filter((m) => m.id && m.provider && m.name)
      .map((m) => ({
        id: m.id,
        provider: m.provider,
        modelName: m.name,
        displayName: m.name,
        description: m.description,
        contextLength: m.context_length,
        maxOutputTokens: m.max_output_tokens,
        pricing: m.pricing
          ? {
              inputPer1M: m.pricing.input,
              outputPer1M: m.pricing.output,
            }
          : undefined,
        capabilities: parseModelsDevCapabilities(m.capabilities),
        supportedParameters: m.parameters,
      }));
  } catch (error) {
    logger.error("Failed to parse models.dev response", { error });
    return [];
  }
}

/**
 * Parse models.dev capabilities object
 */
function parseModelsDevCapabilities(
  capabilities?: Record<string, boolean>,
): GatewayCapabilities {
  if (!capabilities) {
    return { ...DEFAULT_CAPABILITIES };
  }

  return {
    chat: capabilities.chat ?? true,
    completion: capabilities.completion ?? true,
    embedding: capabilities.embedding ?? false,
    imageInput: capabilities.vision ?? false,
    imageOutput: capabilities.image_generation ?? false,
    audioInput: capabilities.audio_input ?? false,
    audioOutput: capabilities.audio_output ?? false,
    videoInput: capabilities.video_input ?? false,
    videoOutput: capabilities.video_output ?? false,
    functionCalling: capabilities.function_calling ?? false,
    jsonMode: capabilities.json_mode ?? false,
    streaming: capabilities.streaming ?? true,
    thinking: capabilities.thinking ?? false,
  };
}

/**
 * Parse OpenRouter API response
 *
 * @param data - Raw response from OpenRouter API
 * @returns Array of parsed model info
 */
export function parseOpenRouterResponse(data: unknown): GatewayModelInfo[] {
  try {
    const response = data as OpenRouterModelsResponse;

    if (!response?.data || !Array.isArray(response.data)) {
      logger.warn("Invalid OpenRouter response: missing data array");
      return [];
    }

    return response.data
      .filter((m) => m.id && m.name)
      .map((m) => {
        // Parse OpenRouter ID format: "provider/model-name"
        const [provider, ...rest] = m.id.split("/");
        const modelName = rest.join("/") || m.id;

        return {
          id: m.id,
          provider: provider || "unknown",
          modelName,
          displayName: m.name,
          description: m.description,
          contextLength: m.context_length,
          pricing: m.pricing
            ? {
                inputPer1M: parseFloat(m.pricing.prompt) * 1000000,
                outputPer1M: parseFloat(m.pricing.completion) * 1000000,
              }
            : undefined,
          capabilities: parseOpenRouterCapabilities(m.supported_parameters),
          supportedParameters: m.supported_parameters,
        };
      });
  } catch (error) {
    logger.error("Failed to parse OpenRouter response", { error });
    return [];
  }
}

/**
 * Parse OpenRouter capabilities from supported parameters
 */
function parseOpenRouterCapabilities(
  parameters?: string[],
): GatewayCapabilities {
  const caps = { ...DEFAULT_CAPABILITIES };

  if (!parameters || !Array.isArray(parameters)) {
    return caps;
  }

  // Infer capabilities from supported parameters
  if (parameters.includes("image") || parameters.includes("images")) {
    caps.imageInput = true;
  }
  if (parameters.includes("tools") || parameters.includes("functions")) {
    caps.functionCalling = true;
  }
  if (
    parameters.includes("response_format") ||
    parameters.includes("json_mode")
  ) {
    caps.jsonMode = true;
  }
  if (parameters.includes("audio")) {
    caps.audioInput = true;
  }
  if (parameters.includes("stream")) {
    caps.streaming = true;
  }

  return caps;
}

/**
 * Parse custom registry format
 *
 * @param data - Raw response data
 * @param schema - Schema definition for parsing
 * @returns Array of parsed model info
 */
export function parseCustomRegistry(
  data: unknown,
  schema: CustomRegistrySchema,
): GatewayModelInfo[] {
  try {
    // Get the models array from the data using the path
    let models: unknown[] = [];

    if (schema.modelsPath) {
      const pathParts = schema.modelsPath.split(".");
      let current: unknown = data;

      for (const part of pathParts) {
        if (current && typeof current === "object" && part in current) {
          current = (current as Record<string, unknown>)[part];
        } else {
          current = undefined;
          break;
        }
      }

      if (Array.isArray(current)) {
        models = current;
      }
    } else if (Array.isArray(data)) {
      models = data;
    }

    if (!models.length) {
      logger.warn("No models found in custom registry response");
      return [];
    }

    return models
      .filter(
        (m): m is Record<string, unknown> =>
          typeof m === "object" && m !== null,
      )
      .map((m) => parseCustomModel(m, schema.fieldMappings))
      .filter((m): m is GatewayModelInfo => m !== null);
  } catch (error) {
    logger.error("Failed to parse custom registry response", { error });
    return [];
  }
}

/**
 * Parse a single model from custom format
 */
function parseCustomModel(
  model: Record<string, unknown>,
  mappings: FieldMappings,
): GatewayModelInfo | null {
  const getValue = (key: string): unknown => {
    const path = mappings[key as keyof FieldMappings];
    if (!path) {
      return undefined;
    }

    const parts = path.split(".");
    let current: unknown = model;

    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  };

  const id = getValue("id") as string;
  const provider = getValue("provider") as string;
  const modelName = getValue("modelName") as string;

  if (!id || (!provider && !modelName)) {
    return null;
  }

  return {
    id,
    provider: provider || id.split("/")[0] || "unknown",
    modelName: modelName || id.split("/").slice(1).join("/") || id,
    displayName: (getValue("displayName") as string) || modelName || id,
    description: getValue("description") as string | undefined,
    contextLength: getValue("contextLength") as number | undefined,
    maxOutputTokens: getValue("maxOutputTokens") as number | undefined,
    capabilities: { ...DEFAULT_CAPABILITIES },
    supportedParameters: getValue("supportedParameters") as
      | string[]
      | undefined,
  };
}

/**
 * Custom registry schema for parsing non-standard formats
 */
export interface CustomRegistrySchema {
  /** Path to models array (e.g., "data.models") */
  modelsPath?: string;
  /** Field mappings from custom format to GatewayModelInfo */
  fieldMappings: FieldMappings;
}

/**
 * Field mappings for custom schema
 */
export interface FieldMappings {
  id: string;
  provider?: string;
  modelName?: string;
  displayName?: string;
  description?: string;
  contextLength?: string;
  maxOutputTokens?: string;
  supportedParameters?: string;
}

/**
 * Merge models from multiple sources with deduplication
 *
 * @param sources - Arrays of models from different sources
 * @param priorityOrder - Source names in priority order (first = highest)
 * @returns Merged and deduplicated model array
 */
export function mergeModelSources(
  sources: GatewayModelInfo[][],
  _priorityOrder: string[] = [],
): GatewayModelInfo[] {
  const seenIds = new Set<string>();
  const merged: GatewayModelInfo[] = [];

  // Process sources in order (first source has highest priority)
  for (const sourceModels of sources) {
    for (const model of sourceModels) {
      if (!seenIds.has(model.id)) {
        seenIds.add(model.id);
        merged.push(model);
      }
    }
  }

  logger.debug(
    `Merged ${merged.length} unique models from ${sources.length} sources`,
  );
  return merged;
}

/**
 * Normalize model data for consistency
 *
 * @param model - Model to normalize
 * @returns Normalized model
 */
export function normalizeModelInfo(model: GatewayModelInfo): GatewayModelInfo {
  return {
    ...model,
    id: model.id.toLowerCase().trim(),
    provider: model.provider.toLowerCase().trim(),
    modelName: model.modelName.trim(),
    displayName: model.displayName || model.modelName,
    capabilities: {
      ...DEFAULT_CAPABILITIES,
      ...model.capabilities,
    },
  };
}
