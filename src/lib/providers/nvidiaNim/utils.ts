import { NvidiaNimModels } from "../../constants/enums.js";
import { createProxyFetch, maskProxyUrl } from "../../proxy/proxyFetch.js";
import type { NvidiaNimExtraBody } from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import {
  createNvidiaNimConfig,
  getProviderModel,
  validateApiKey,
} from "../../utils/providerConfig.js";

export const makeLoggingFetch = (provider: string): typeof fetch => {
  const base = createProxyFetch();
  return (async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const reqSize =
      init?.body && typeof init.body === "string" ? init.body.length : 0;
    const response = await base(input, init);
    if (!response.ok) {
      const safeUrl = maskProxyUrl(url) ?? "<redacted>";
      if (process.env.NEUROLINK_DEBUG_HTTP === "1") {
        const clone = response.clone();
        const body = await clone.text().catch(() => "<unreadable>");
        logger.warn(`[${provider}] upstream ${response.status}`, {
          url: safeUrl,
          body: body.slice(0, 800),
          reqSize,
        });
      } else {
        logger.warn(
          `[${provider}] upstream ${response.status} url=${safeUrl} reqSize=${reqSize}`,
        );
      }
    }
    return response;
  }) as typeof fetch;
};

export const envInt = (k: string): number | undefined => {
  const v = process.env[k];
  if (!v) {
    return undefined;
  }
  const parsed = Number.parseInt(v, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const envFloat = (k: string): number | undefined => {
  const v = process.env[k];
  if (!v) {
    return undefined;
  }
  const parsed = Number.parseFloat(v);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const buildNvidiaNimExtraBody = (
  thinkingEnabled: boolean,
  maxTokens: number | undefined,
): NvidiaNimExtraBody => {
  const extra: NvidiaNimExtraBody = {};

  const topK = envInt("NVIDIA_NIM_TOP_K");
  if (topK !== undefined && topK !== -1) {
    extra.top_k = topK;
  }

  const minP = envFloat("NVIDIA_NIM_MIN_P");
  if (minP !== undefined && minP !== 0) {
    extra.min_p = minP;
  }

  const repPenalty = envFloat("NVIDIA_NIM_REPETITION_PENALTY");
  if (repPenalty !== undefined && repPenalty !== 1) {
    extra.repetition_penalty = repPenalty;
  }

  const minTokens = envInt("NVIDIA_NIM_MIN_TOKENS");
  if (minTokens !== undefined && minTokens !== 0) {
    extra.min_tokens = minTokens;
  }

  const chatTemplate = process.env.NVIDIA_NIM_CHAT_TEMPLATE;
  if (chatTemplate) {
    extra.chat_template = chatTemplate;
  }

  if (thinkingEnabled) {
    extra.chat_template_kwargs = {
      thinking: true,
      enable_thinking: true,
      ...(maxTokens ? { reasoning_budget: maxTokens } : {}),
    };
  }

  return extra;
};

export const stripReasoningBudget = (
  body: NvidiaNimExtraBody,
): NvidiaNimExtraBody => {
  const cloned: NvidiaNimExtraBody = { ...body };
  if (cloned.chat_template_kwargs) {
    const { reasoning_budget: _ignored, ...rest } = cloned.chat_template_kwargs;
    cloned.chat_template_kwargs = rest;
    if (Object.keys(cloned.chat_template_kwargs).length === 0) {
      delete cloned.chat_template_kwargs;
    }
  }
  return cloned;
};

export const stripChatTemplate = (
  body: NvidiaNimExtraBody,
): NvidiaNimExtraBody => {
  const { chat_template: _ignored, ...rest } = body;
  return rest;
};

export const getNimApiKey = (): string => {
  return validateApiKey(createNvidiaNimConfig());
};

export const getDefaultNimModel = (): string => {
  return getProviderModel(
    "NVIDIA_NIM_MODEL",
    NvidiaNimModels.LLAMA_3_3_70B_INSTRUCT,
  );
};
