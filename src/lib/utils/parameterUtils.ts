/**
 * Parameter Utilities
 * Shared helper functions for parsing provider options
 */

import type { TextGenerationOptions, StreamTextOptions } from '../core/types.js';

export interface ParsedOptions {
  prompt: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  schema?: any;
}

/**
 * Parse options for text generation methods
 * Supports both string prompts and options objects for backward compatibility
 */
export function parseOptions(
  optionsOrPrompt: TextGenerationOptions | StreamTextOptions | string,
  defaultSystemPrompt: string
): ParsedOptions {
  // Handle string input (backward compatibility)
  const options = typeof optionsOrPrompt === 'string'
    ? { prompt: optionsOrPrompt }
    : optionsOrPrompt;

  // Extract parameters with defaults
  const {
    prompt,
    temperature = 0.7,
    maxTokens = 500,
    systemPrompt = defaultSystemPrompt,
    schema
  } = options;

  return {
    prompt,
    temperature,
    maxTokens,
    systemPrompt,
    schema
  };
}

/**
 * Parse options for stream text methods
 * Wrapper for parseOptions with specific typing for StreamTextOptions
 */
export function parseStreamOptions(
  optionsOrPrompt: StreamTextOptions | string,
  defaultSystemPrompt: string
): ParsedOptions {
  return parseOptions(optionsOrPrompt, defaultSystemPrompt);
}

/**
 * Parse options for generate text methods
 * Wrapper for parseOptions with specific typing for TextGenerationOptions
 */
export function parseGenerateOptions(
  optionsOrPrompt: TextGenerationOptions | string,
  defaultSystemPrompt: string
): ParsedOptions {
  return parseOptions(optionsOrPrompt, defaultSystemPrompt);
}
