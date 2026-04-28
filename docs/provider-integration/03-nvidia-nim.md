# 03 · NVIDIA NIM Provider — Implementation Spec

**Difficulty:** ⭐⭐⭐⭐ Most complex. Implement last (after the simpler three are validated).

## Source-repo reference

- `/free-claude-code/providers/nvidia_nim/__init__.py` — `from .client import NvidiaNimProvider`
- `/free-claude-code/providers/nvidia_nim/client.py` (70 lines) — `NvidiaNimProvider(OpenAIChatTransport)` with `_get_retry_request_body()` for 400-error retry
- `/free-claude-code/providers/nvidia_nim/request.py` (140 lines) — extra-body builder with NIM-specific params
- `/free-claude-code/nvidia_nim_models.json` (22KB) — full model catalog
- `/free-claude-code/providers/defaults.py:8` — `NVIDIA_NIM_DEFAULT_BASE = "https://integrate.api.nvidia.com/v1"`
- `/free-claude-code/providers/registry.py:44-53` — capabilities `("chat","streaming","tools","thinking","rate_limit")`

## Wire-format facts

| Concern              | Value                                                  |
| -------------------- | ------------------------------------------------------ |
| Hosted base URL      | `https://integrate.api.nvidia.com/v1`                  |
| Self-hosted base URL | User-supplied (override via `NVIDIA_NIM_BASE_URL`)     |
| Auth header          | `Authorization: Bearer $NVIDIA_NIM_API_KEY`            |
| API key env          | `NVIDIA_NIM_API_KEY`                                   |
| Streaming            | OpenAI-compat SSE                                      |
| Tool calling         | Supported on most models                               |
| Vision               | Supported on Llama 3.2 Vision, Nemotron Vision, etc.   |
| Reasoning            | Llama Nemotron + DeepSeek-R1 distills expose reasoning |

## NIM-specific extras (the reason this provider is complex)

The Python source builds `extra_body` with these fields when the request requires them. Our TS port passes them via Vercel AI SDK's `providerOptions.openai.body`:

| Extra field                             | Source: `request.py` line | Purpose                                 |
| --------------------------------------- | ------------------------- | --------------------------------------- |
| `top_k`                                 | 121                       | Sampling — usually `-1` to disable      |
| `min_p`                                 | 122                       | Min probability cutoff                  |
| `repetition_penalty`                    | 123                       | Anti-repetition                         |
| `min_tokens`                            | 126                       | Force minimum output length             |
| `chat_template`                         | 127                       | Override the model's default template   |
| `request_id`                            | 128                       | Pass-through for NIM's request tracking |
| `ignore_eos`                            | 129                       | Don't stop at EOS token                 |
| `chat_template_kwargs.thinking`         | 113                       | Enable reasoning                        |
| `chat_template_kwargs.enable_thinking`  | 113                       | Same (alias)                            |
| `chat_template_kwargs.reasoning_budget` | 117                       | Token budget for reasoning              |

**Critical retry logic** (source: `client.py:41-69`): on HTTP 400, inspect the error body. If it complains about `reasoning_budget`, retry once with that field stripped (via `clone_body_without_reasoning_budget`). If it complains about `chat_template`, retry once stripping `chat_template`. This handles models that don't support those extras.

## Models

We seed 15 popular models in the enum (see `01-shared-changes.md` §1c). Users can pass arbitrary IDs via `--model` since NIM hosts hundreds.

| ID                                       | Context | Vision | Reasoning |
| ---------------------------------------- | ------- | ------ | --------- |
| `meta/llama-3.3-70b-instruct` (default)  | 128K    | ❌     | ❌        |
| `meta/llama-3.1-405b-instruct`           | 128K    | ❌     | ❌        |
| `meta/llama-3.2-90b-vision-instruct`     | 128K    | ✅     | ❌        |
| `nvidia/llama-3.3-nemotron-super-49b-v1` | 128K    | ❌     | ✅        |
| `deepseek-ai/deepseek-r1`                | 128K    | ❌     | ✅        |
| `mistralai/mixtral-8x22b-instruct-v0.1`  | 64K     | ❌     | ❌        |
| `microsoft/phi-4`                        | 16K     | ❌     | ❌        |
| etc.                                     |         |        |           |

## File: `src/lib/providers/nvidiaNim.ts` (NEW)

Mirror the DeepSeek skeleton, with these critical differences:

1. **Build `providerOptions.openai.body` from request + env defaults.** Allow per-call override via `options.providerOptions`.
2. **Implement retry-on-400** wrapping `streamText` in a try/catch — but Vercel AI SDK doesn't expose mid-stream retries cleanly, so we retry by re-invoking `streamText` on first-chunk failure.
3. **Read NIM env defaults** for `temperature`, `top_p`, `top_k`, `min_p`, etc. (mirror the `NimSettings` Pydantic model from `/free-claude-code/config/nim.py`).

```ts
import { createOpenAI } from "@ai-sdk/openai";
import { type LanguageModel, stepCountIs, streamText, type Tool } from "ai";
import type { AIProviderName } from "../constants/enums.js";
import { NvidiaNimModels } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import type { NeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  UnknownRecord,
  NeurolinkCredentials,
  StreamOptions,
  StreamResult,
  ValidationSchema,
} from "../types/index.js";
import { emitToolEndFromStepFinish } from "../utils/toolEndEmitter.js";
import { logger } from "../utils/logger.js";
import {
  createNvidiaNimConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import {
  composeAbortSignals,
  createTimeoutController,
  TimeoutError,
} from "../utils/timeout.js";
import { resolveToolChoice } from "../utils/toolChoice.js";
import { toAnalyticsStreamResult } from "./providerTypeUtils.js";

const NVIDIA_NIM_DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";

// NOTE: per CLAUDE.md rule 2, type aliases live in `src/lib/types/`. The
// shipped impl exports `NvidiaNvidiaNimExtraBody` from `src/lib/types/providers.ts`
// (renamed for the global-uniqueness rule 9) and imports it here. The shape
// below is illustrative only — do NOT redeclare it provider-locally.
//
// type NvidiaNvidiaNimExtraBody = {
//   top_k?: number;
//   min_p?: number;
//   repetition_penalty?: number;
//   min_tokens?: number;
//   chat_template?: string;
//   request_id?: string;
//   ignore_eos?: boolean;
//   chat_template_kwargs?: {
//     thinking?: boolean;
//     enable_thinking?: boolean;
//     reasoning_budget?: number;
//   };
// };

const buildNvidiaNimExtraBody = (
  options: StreamOptions,
  thinkingEnabled: boolean,
  maxTokens: number | undefined,
): NvidiaNimExtraBody => {
  const extra: NvidiaNimExtraBody = {};

  // Read defaults from env, allow request-time override via options.
  // NaN-guard so a malformed value (e.g. NVIDIA_NIM_TOP_K=foo) is dropped
  // instead of being forwarded into extra_body as `NaN` and breaking every
  // request — matches the runtime helpers in src/lib/providers/nvidiaNim.ts.
  const envInt = (k: string) => {
    const v = process.env[k];
    if (!v) return undefined;
    const parsed = Number.parseInt(v, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const envFloat = (k: string) => {
    const v = process.env[k];
    if (!v) return undefined;
    const parsed = Number.parseFloat(v);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const topK = envInt("NVIDIA_NIM_TOP_K");
  if (topK !== undefined && topK !== -1) extra.top_k = topK;

  const minP = envFloat("NVIDIA_NIM_MIN_P");
  if (minP !== undefined && minP !== 0) extra.min_p = minP;

  const repPenalty = envFloat("NVIDIA_NIM_REPETITION_PENALTY");
  if (repPenalty !== undefined && repPenalty !== 1) {
    extra.repetition_penalty = repPenalty;
  }

  const minTokens = envInt("NVIDIA_NIM_MIN_TOKENS");
  if (minTokens !== undefined && minTokens !== 0) extra.min_tokens = minTokens;

  const chatTemplate = process.env.NVIDIA_NIM_CHAT_TEMPLATE;
  if (chatTemplate) extra.chat_template = chatTemplate;

  if (thinkingEnabled) {
    extra.chat_template_kwargs = {
      thinking: true,
      enable_thinking: true,
      ...(maxTokens ? { reasoning_budget: maxTokens } : {}),
    };
  }

  return extra;
};

/** Strip `reasoning_budget` from extra body — used on 400 retry */
const stripReasoningBudget = (body: NvidiaNimExtraBody): NvidiaNimExtraBody => {
  const cloned = { ...body };
  if (cloned.chat_template_kwargs) {
    const { reasoning_budget: _, ...rest } = cloned.chat_template_kwargs;
    cloned.chat_template_kwargs = rest;
    if (Object.keys(cloned.chat_template_kwargs).length === 0) {
      delete cloned.chat_template_kwargs;
    }
  }
  return cloned;
};

/** Strip `chat_template` from extra body — used on 400 retry */
const stripChatTemplate = (body: NvidiaNimExtraBody): NvidiaNimExtraBody => {
  const { chat_template: _, ...rest } = body;
  return rest;
};

const getNimApiKey = (): string => {
  return validateApiKey(createNvidiaNimConfig());
};

const getDefaultNimModel = (): string => {
  return getProviderModel(
    "NVIDIA_NIM_MODEL",
    NvidiaNimModels.LLAMA_3_3_70B_INSTRUCT,
  );
};

/**
 * NVIDIA NIM Provider
 * Wraps NVIDIA's hosted (or self-hosted) inference endpoints via OpenAI-compat API.
 * Supports the full extra-body parameter set used by NIM
 * (top_k, min_p, repetition_penalty, chat_template_kwargs, reasoning_budget).
 * Implements one-retry-on-400 to gracefully handle models that reject specific extras.
 */
export class NvidiaNimProvider extends BaseProvider {
  private model: LanguageModel;
  private apiKey: string;
  private baseURL: string;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["nvidiaNim"],
  ) {
    const validatedNeurolink =
      sdk && typeof sdk === "object" && "getInMemoryServers" in sdk
        ? sdk
        : undefined;

    super(
      modelName,
      "nvidia-nim" as AIProviderName,
      validatedNeurolink as NeuroLink | undefined,
    );

    this.apiKey = credentials?.apiKey ?? getNimApiKey();
    this.baseURL =
      credentials?.baseURL ??
      process.env.NVIDIA_NIM_BASE_URL ??
      NVIDIA_NIM_DEFAULT_BASE_URL;

    const nim = createOpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      fetch: createProxyFetch(),
    });
    // .chat() targets /v1/chat/completions. The default `nim(modelId)` call
    // hits the Responses API, which NIM doesn't expose.
    this.model = nim.chat(this.modelName);

    logger.debug("NVIDIA NIM Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: this.baseURL,
    });
  }

  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

    const startTime = Date.now();
    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools
        ? (options.tools as Record<string, Tool>) || (await this.getAllTools())
        : {};

      const messages = await this.buildMessagesForStream(options);
      const model = await this.getAISDKModelWithMiddleware(options);

      // Decide whether thinking is enabled (mirrors source repo's logic)
      const thinkingEnabled =
        options.thinkingLevel !== undefined &&
        options.thinkingLevel !== "minimal";
      let extraBody = buildNvidiaNimExtraBody(
        options,
        thinkingEnabled,
        options.maxTokens,
      );

      const callStream = (
        body: NvidiaNimExtraBody,
        stripped: Array<"reasoning_budget" | "chat_template"> = [],
      ) =>
        streamText({
          model,
          messages,
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
          tools,
          stopWhen: stepCountIs(options.maxSteps || DEFAULT_MAX_STEPS),
          toolChoice: resolveToolChoice(options, tools, shouldUseTools),
          abortSignal: composeAbortSignals(
            options.abortSignal,
            timeoutController?.controller.signal,
          ),
          providerOptions: (() => {
            // Merge with caller-supplied providerOptions instead of replacing.
            // Per-call overrides win; chat_template_kwargs is merged shallowly
            // so an override of one field doesn't drop env-driven flags.
            const callerBase =
              ((options as unknown as Record<string, unknown>)
                .providerOptions as Record<string, unknown> | undefined) ?? {};
            const callerOpenai =
              (callerBase.openai as Record<string, unknown> | undefined) ?? {};
            const callerBody =
              (callerOpenai.body as Record<string, unknown> | undefined) ?? {};
            const defaultsBody = body as unknown as Record<string, unknown>;
            const mergedBody: Record<string, unknown> = {
              ...defaultsBody,
              ...callerBody,
            };
            const mergedKwargs: Record<string, unknown> = {
              ...((defaultsBody.chat_template_kwargs as
                | Record<string, unknown>
                | undefined) ?? {}),
              ...((callerBody.chat_template_kwargs as
                | Record<string, unknown>
                | undefined) ?? {}),
            };
            // Apply retry-strip AFTER merging so caller-supplied copies of
            // the offending field are also dropped from the retry request.
            // Without this, callers that explicitly set chat_template or
            // chat_template_kwargs.reasoning_budget would reintroduce the
            // exact field NIM just rejected with a 400.
            if (stripped.includes("chat_template")) {
              delete mergedBody.chat_template;
            }
            if (stripped.includes("reasoning_budget")) {
              delete mergedKwargs.reasoning_budget;
            }
            if (Object.keys(mergedKwargs).length > 0) {
              mergedBody.chat_template_kwargs = mergedKwargs;
            } else {
              delete mergedBody.chat_template_kwargs;
            }
            if (
              Object.keys(callerBase).length === 0 &&
              Object.keys(mergedBody).length === 0
            ) {
              return undefined;
            }
            return {
              ...callerBase,
              openai: { ...callerOpenai, body: mergedBody },
            };
          })(),
          experimental_telemetry:
            this.telemetryHandler.getTelemetryConfig(options),
          experimental_repairToolCall: this.getToolCallRepairFn(options),
          onStepFinish: ({ toolCalls, toolResults }) => {
            emitToolEndFromStepFinish(
              this.neurolink?.getEventEmitter(),
              toolResults as Array<{
                toolName: string;
                output?: unknown;
                result?: unknown;
                error?: string;
              }>,
            );
            this.handleToolExecutionStorage(
              toolCalls,
              toolResults,
              options,
              new Date(),
            ).catch((error: unknown) => {
              logger.warn(
                "[NvidiaNimProvider] Failed to store tool executions",
                {
                  provider: this.providerName,
                  error: error instanceof Error ? error.message : String(error),
                },
              );
            });
          },
        });

      let result;
      try {
        result = await callStream(extraBody);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const status = (error as { statusCode?: number })?.statusCode;
        if (status === 400) {
          const lower = errMsg.toLowerCase();
          if (lower.includes("reasoning_budget")) {
            logger.warn("NIM rejected reasoning_budget; retrying without it");
            extraBody = stripReasoningBudget(extraBody);
            result = await callStream(extraBody, ["reasoning_budget"]);
          } else if (lower.includes("chat_template")) {
            logger.warn("NIM rejected chat_template; retrying without it");
            extraBody = stripChatTemplate(extraBody);
            result = await callStream(extraBody, ["chat_template"]);
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      timeoutController?.cleanup();
      const transformedStream = this.createTextStream(result);
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName,
        toAnalyticsStreamResult(result),
        Date.now() - startTime,
        {
          requestId: `nvidia-nim-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName,
        analytics: analyticsPromise,
        metadata: { startTime, streamId: `nvidia-nim-${Date.now()}` },
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  protected getProviderName(): AIProviderName {
    return this.providerName;
  }

  protected getDefaultModel(): string {
    return getDefaultNimModel();
  }

  protected getAISDKModel(): LanguageModel {
    return this.model;
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new Error(`NVIDIA NIM request timed out: ${error.message}`);
    }
    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";

    if (
      message.includes("Invalid API key") ||
      message.includes("401") ||
      message.includes("Unauthorized")
    ) {
      return new Error(
        "Invalid NVIDIA NIM API key. Get one at https://build.nvidia.com/settings/api-keys",
      );
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return new Error("NVIDIA NIM rate limit exceeded");
    }
    if (message.includes("404") || message.includes("model_not_found")) {
      return new Error(
        `NVIDIA NIM model '${this.modelName}' not available. Browse the catalog at https://build.nvidia.com/models`,
      );
    }
    if (message.includes("quota") || message.includes("403")) {
      return new Error("NVIDIA NIM quota exceeded for your account");
    }
    return new Error(`NVIDIA NIM error: ${message}`);
  }

  async validateConfiguration(): Promise<boolean> {
    // Honor constructor-resolved credentials so per-call / instance-level
    // credentials are reflected (re-reading env via getNimApiKey would
    // ignore them).
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName,
      defaultModel: getDefaultNimModel(),
      baseURL: this.baseURL,
    };
  }
}

export default NvidiaNimProvider;
```

## Pre-implementation verification

**Before writing this provider, verify** (the `ai-sdk-verifier` agent task is dedicated to this):

1. `@ai-sdk/openai` version installed in `package.json`
2. That version supports `providerOptions.openai.body` to pass arbitrary extra body fields. Look at:
   ```bash
   grep -rn "providerOptions" src/lib/providers/openRouter.ts src/lib/providers/litellm.ts | head -10
   ```

If `providerOptions.openai.body` is NOT supported (older AI SDK versions used different keys), the fallback is **fetch interception**:

```ts
const nim = createOpenAI({
  apiKey: this.apiKey,
  baseURL: this.baseURL,
  fetch: async (input, init) => {
    if (init?.body && typeof init.body === "string") {
      const body = JSON.parse(init.body);
      Object.assign(body, extraBody); // mutate
      init = { ...init, body: JSON.stringify(body) };
    }
    return createProxyFetch()(input, init);
  },
});
```

Use whichever pattern works with the installed AI SDK version.

## Edge cases & special handling

1. **Reasoning models on NIM**: `nvidia/llama-3.3-nemotron-super-49b-v1`, `deepseek-ai/deepseek-r1`, etc. expose reasoning. Set `chat_template_kwargs.thinking=true` and `reasoning_budget=<maxTokens>`. The retry-on-400 strips these if the model rejects them.
2. **Vision models**: `meta/llama-3.2-90b-vision-instruct` accepts images via standard OpenAI message format. Already handled by `BaseProvider.buildMessagesForStream`.
3. **Self-hosted NIM**: User overrides `NVIDIA_NIM_BASE_URL`. Auth header still goes (set to anything for unauthenticated self-hosted).
4. **Model catalog drift**: We seed 15 enum values. Users pass arbitrary IDs via `--model`. The code does NOT validate the model ID — NIM will return 404 if invalid.
5. **`parallel_tool_calls=true` default in source repo (`request.py:104`)**: AI SDK's default is also true; no explicit setting needed.

## Smoke test

```bash
export NVIDIA_NIM_API_KEY="nvapi-..."
pnpm run build:cli
pnpm run cli generate "Hello from NIM" --provider nvidia-nim
pnpm run cli generate "Solve: 17! mod 13" --provider nvidia-nim --model deepseek-ai/deepseek-r1 --thinking-level high
pnpm run cli generate "Describe this" --provider nvidia-nim --model meta/llama-3.2-90b-vision-instruct --image ./photo.jpg
```

## Cross-references

- Shared file edits: `01-shared-changes.md` §1c (NvidiaNimModels enum), §2 (credentials), §3 (createNvidiaNimConfig), §4 (registry), §5 (barrel), §7 (context windows), §8 (vision), §9 (.env)
- Tests: `06-testing.md`
- AI SDK verification: see `ai-sdk-verifier` task in the team's task list
