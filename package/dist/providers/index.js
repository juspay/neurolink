/**
 * Provider exports for Vercel AI SDK integration
 * This file centralizes all AI provider classes for easy import and usage
 */
export { GoogleVertexAI } from "./googleVertexAI.js";
export { AmazonBedrock } from "./amazonBedrock.js";
export { OpenAI } from "./openAI.js";
/**
 * Provider registry for dynamic provider instantiation
 */
export const PROVIDERS = {
  vertex: "GoogleVertexAI",
  bedrock: "AmazonBedrock",
  openai: "OpenAI",
};
/**
 * List of all available provider names
 */
export const AVAILABLE_PROVIDERS = Object.keys(PROVIDERS);
