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
export declare class AmazonBedrock implements AIProvider {
  private modelName;
  private model;
  private bedrock;
  constructor(modelName?: string | null);
  streamText(
    optionsOrPrompt: StreamTextOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamTextResult<ToolSet, unknown> | null>;
  generateText(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<GenerateTextResult<ToolSet, unknown> | null>;
}
