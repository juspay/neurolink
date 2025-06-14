/**
 * Supported AI Provider Names
 */
export var AIProviderName;
(function (AIProviderName) {
  AIProviderName["BEDROCK"] = "bedrock";
  AIProviderName["OPENAI"] = "openai";
  AIProviderName["VERTEX"] = "vertex";
})(AIProviderName || (AIProviderName = {}));
/**
 * Supported Models for Amazon Bedrock
 */
export var BedrockModels;
(function (BedrockModels) {
  BedrockModels["CLAUDE_3_SONNET"] = "anthropic.claude-3-sonnet-20240229-v1:0";
  BedrockModels["CLAUDE_3_HAIKU"] = "anthropic.claude-3-haiku-20240307-v1:0";
  BedrockModels["CLAUDE_3_5_SONNET"] =
    "anthropic.claude-3-5-sonnet-20240620-v1:0";
  BedrockModels["CLAUDE_3_7_SONNET"] =
    "arn:aws:bedrock:us-east-2:225681119357:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0";
})(BedrockModels || (BedrockModels = {}));
/**
 * Supported Models for OpenAI
 */
export var OpenAIModels;
(function (OpenAIModels) {
  OpenAIModels["GPT_4"] = "gpt-4";
  OpenAIModels["GPT_4_TURBO"] = "gpt-4-turbo";
  OpenAIModels["GPT_4O"] = "gpt-4o";
  OpenAIModels["GPT_4O_MINI"] = "gpt-4o-mini";
  OpenAIModels["GPT_3_5_TURBO"] = "gpt-3.5-turbo";
})(OpenAIModels || (OpenAIModels = {}));
/**
 * Supported Models for Google Vertex AI
 */
export var VertexModels;
(function (VertexModels) {
  VertexModels["CLAUDE_4_0_SONNET"] = "claude-sonnet-4@20250514";
  VertexModels["GEMINI_2_5_FLASH"] = "gemini-2.5-flash-preview-05-20";
})(VertexModels || (VertexModels = {}));
/**
 * Default provider configurations
 */
export const DEFAULT_PROVIDER_CONFIGS = [
  {
    provider: AIProviderName.BEDROCK,
    models: [BedrockModels.CLAUDE_3_7_SONNET, BedrockModels.CLAUDE_3_5_SONNET],
  },
  {
    provider: AIProviderName.VERTEX,
    models: [VertexModels.CLAUDE_4_0_SONNET, VertexModels.GEMINI_2_5_FLASH],
  },
  {
    provider: AIProviderName.OPENAI,
    models: [OpenAIModels.GPT_4O, OpenAIModels.GPT_4O_MINI],
  },
];
