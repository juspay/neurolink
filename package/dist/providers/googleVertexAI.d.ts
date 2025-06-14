import type { ZodType, ZodTypeDef } from "zod";
import {
  type StreamTextResult,
  type ToolSet,
  type Schema,
  type GenerateTextResult,
} from "ai";
import type {
  AIProvider,
  TextGenerationOptions,
  StreamTextOptions,
} from "../core/types.js";
export declare class GoogleVertexAI implements AIProvider {
  private modelName;
  /**
   * Initializes a new instance of GoogleVertexAI
   * @param modelName - Optional model name to override the default from config
   */
  constructor(modelName?: string | null);
  /**
   * Gets the appropriate model instance (Google or Anthropic)
   * @private
   */
  private getModel;
  /**
   * Processes text using streaming approach with enhanced error handling callbacks
   * @param prompt - The input text prompt to analyze
   * @param analysisSchema - Optional Zod schema or Schema object for output validation
   * @returns Promise resolving to StreamTextResult or null if operation fails
   */
  streamText(
    optionsOrPrompt: StreamTextOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamTextResult<ToolSet, unknown> | null>;
  /**
   * Processes text using non-streaming approach with optional schema validation
   * @param prompt - The input text prompt to analyze
   * @param analysisSchema - Optional Zod schema or Schema object for output validation
   * @returns Promise resolving to GenerateTextResult or null if operation fails
   */
  generateText(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<GenerateTextResult<ToolSet, unknown> | null>;
}
