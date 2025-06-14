/**
 * Provider exports for Vercel AI SDK integration
 * This file centralizes all AI provider classes for easy import and usage
 */
export { GoogleVertexAI } from "./googleVertexAI.js";
export { AmazonBedrock } from "./amazonBedrock.js";
export { OpenAI } from "./openAI.js";
export type { AIProvider } from "../core/types.js";
/**
 * Provider registry for dynamic provider instantiation
 */
export declare const PROVIDERS: {
  readonly vertex: "GoogleVertexAI";
  readonly bedrock: "AmazonBedrock";
  readonly openai: "OpenAI";
};
/**
 * Type for valid provider names
 */
export type ProviderName = keyof typeof PROVIDERS;
/**
 * List of all available provider names
 */
export declare const AVAILABLE_PROVIDERS: ProviderName[];
