import type { ProviderModelManifest } from "../../types/index.js";

/**
 * Context windows from the vendor's SambaCloud model specifications page
 * (docs.sambanova.ai, checked 2026-08-27): 128K on the production mainline
 * (Meta-Llama-3.3-70B-Instruct, gpt-oss-120b, DeepSeek-V3.1), 192K on
 * MiniMax-M2.7, 32K on the DeepSeek-V3.2 preview. Max output is not
 * published — the 8192 floor stays deliberately conservative, same
 * pattern as groq.ts/cerebras.ts. gemma-4-31B-it is the one vision model
 * (text+image+video per the vendor page).
 */
export const sambanovaManifest: ProviderModelManifest = {
  defaultContextWindow: 131072,
  models: {
    _default: {
      aliases: [],
      contextWindow: 131072,
      maxOutputTokens: 8192,
      vision: false,
      functionCalling: true,
    },
    "MiniMax-M2.7": {
      aliases: [],
      contextWindow: 196608,
      maxOutputTokens: 8192,
      vision: false,
      functionCalling: true,
    },
    "DeepSeek-V3.2": {
      aliases: [],
      contextWindow: 32768,
      maxOutputTokens: 8192,
      vision: false,
      functionCalling: true,
    },
    "gemma-4-31B-it": {
      aliases: [],
      contextWindow: 131072,
      maxOutputTokens: 8192,
      vision: true,
      functionCalling: true,
    },
  },
};
