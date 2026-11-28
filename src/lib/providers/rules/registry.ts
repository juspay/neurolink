/**
 * Every provider rules file, by provider id. Provider classes read their
 * behaviour from here instead of hard-coding it. To add a rule, edit the
 * JSON file; `schema.ts` validates every file in the provider-rules suite.
 */
import anthropicRules from "./anthropic.json" with { type: "json" };
import azureRules from "./azure.json" with { type: "json" };
import bedrockRules from "./bedrock.json" with { type: "json" };
import cohereRules from "./cohere.json" with { type: "json" };
import credentialsRules from "./credentials.json" with { type: "json" };
import geminiRules from "./gemini.json" with { type: "json" };
import googleAiRules from "./google-ai.json" with { type: "json" };
import limitsRules from "./limits.json" with { type: "json" };
import modelFamiliesRules from "./model-families.json" with { type: "json" };
import litellmRules from "./litellm.json" with { type: "json" };
import llamacppRules from "./llamacpp.json" with { type: "json" };
import lmStudioRules from "./lm-studio.json" with { type: "json" };
import nvidiaNimRules from "./nvidia-nim.json" with { type: "json" };
import ollamaRules from "./ollama.json" with { type: "json" };
import openaiRules from "./openai.json" with { type: "json" };
import openaiChatRules from "./openai-chat.json" with { type: "json" };
import openaiCompatibleRules from "./openai-compatible.json" with { type: "json" };
import openrouterRules from "./openrouter.json" with { type: "json" };
import proxyRules from "./proxy.json" with { type: "json" };
import sagemakerRules from "./sagemaker.json" with { type: "json" };
import structuredOutputRules from "./structured-output.json" with { type: "json" };
import usageRules from "./usage.json" with { type: "json" };
import vertexRules from "./vertex.json" with { type: "json" };
import visionRules from "./vision.json" with { type: "json" };
import type {
  ProviderRuleErrors,
  ProviderRulesFile,
} from "../../types/index.js";

const RULES_FILES = [
  anthropicRules,
  azureRules,
  bedrockRules,
  cohereRules,
  credentialsRules,
  geminiRules,
  googleAiRules,
  limitsRules,
  modelFamiliesRules,
  litellmRules,
  llamacppRules,
  lmStudioRules,
  nvidiaNimRules,
  ollamaRules,
  openaiRules,
  openaiChatRules,
  openaiCompatibleRules,
  openrouterRules,
  proxyRules,
  sagemakerRules,
  structuredOutputRules,
  usageRules,
  vertexRules,
  visionRules,
] as ProviderRulesFile[];

const BY_ID = new Map(RULES_FILES.map((file) => [file.id, file]));

/** All rules files, for validation and documentation. */
export function listProviderRules(): readonly ProviderRulesFile[] {
  return RULES_FILES;
}

/** The rules file for a provider; throws when the provider has none. */
export function getProviderRules(id: string): ProviderRulesFile {
  const file = BY_ID.get(id);
  if (!file) {
    throw new Error(
      `No provider rules file for "${id}" in src/lib/providers/rules/`,
    );
  }
  return file;
}

/** A provider's error rules; throws when its rules file has none. */
export function getProviderErrorRules(id: string): ProviderRuleErrors {
  const errors = getProviderRules(id).errors;
  if (!errors) {
    throw new Error(`Provider rules file "${id}.json" has no "errors" block`);
  }
  return errors;
}
