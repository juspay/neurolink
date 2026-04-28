# 02 · DeepSeek Provider — Implementation Spec

**Difficulty:** ⭐ Easiest. Implement first.

## Source-repo reference

- `/free-claude-code/providers/deepseek/__init__.py` — `from .client import DeepSeekProvider`
- `/free-claude-code/providers/deepseek/client.py` (29 lines) — `DeepSeekProvider(OpenAIChatTransport)` — sets `provider_name="DEEPSEEK"`, `base_url=DEEPSEEK_BASE_URL`
- `/free-claude-code/providers/deepseek/request.py` (40 lines) — `build_request_body(request, *, thinking_enabled)` — sets `extra_body.thinking = {type: enabled}` for non-`deepseek-reasoner` models
- `/free-claude-code/providers/defaults.py:9` — `DEEPSEEK_DEFAULT_BASE = "https://api.deepseek.com"` (note: NO `/v1` suffix)
- `/free-claude-code/providers/registry.py:64-72` — descriptor: `transport_type="openai_chat"`, capabilities `("chat","streaming","thinking")`

## Wire-format facts

| Concern         | Value                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------- |
| Base URL        | `https://api.deepseek.com` (NOT `/v1`)                                                          |
| Auth header     | `Authorization: Bearer $DEEPSEEK_API_KEY`                                                       |
| Endpoint        | `POST /chat/completions` (the OpenAI client adds `/v1/` if needed; DeepSeek's API accepts both) |
| API key env     | `DEEPSEEK_API_KEY`                                                                              |
| Streaming       | OpenAI-compat SSE                                                                               |
| Tool calling    | Yes (`deepseek-chat`); limited on `deepseek-reasoner`                                           |
| Vision          | **No** — text-only                                                                              |
| Reasoning       | `deepseek-reasoner` exposes `reasoning_content` field (separate from `content`)                 |
| Thinking opt-in | For `deepseek-chat`: send `extra_body.thinking = {type: "enabled"}`                             |

## Models

| ID                  | Name        | Context | Notes                                                              |
| ------------------- | ----------- | ------- | ------------------------------------------------------------------ |
| `deepseek-chat`     | DeepSeek-V3 | 64K     | Default; tool calling supported                                    |
| `deepseek-reasoner` | DeepSeek-R1 | 64K     | Reasoning model; `reasoning_content` field; some tool restrictions |

## File: `src/lib/providers/deepseek.ts` (NEW)

Mirror `src/lib/providers/mistral.ts` (251 lines) almost verbatim. Differences:

- Use `createOpenAI` (from `@ai-sdk/openai`) instead of `createMistral`
- Different env var, default model, alias name
- Add `reasoning_content` mapping note (AI SDK v6 surfaces this via `result.reasoning`)

```ts
import { createOpenAI } from "@ai-sdk/openai";
import { type LanguageModel, stepCountIs, streamText, type Tool } from "ai";
import type { AIProviderName } from "../constants/enums.js";
import { DeepSeekModels } from "../constants/enums.js";
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
  createDeepSeekConfig,
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

const DEEPSEEK_DEFAULT_BASE_URL = "https://api.deepseek.com";

const getDeepSeekApiKey = (): string => {
  return validateApiKey(createDeepSeekConfig());
};

const getDefaultDeepSeekModel = (): string => {
  return getProviderModel("DEEPSEEK_MODEL", DeepSeekModels.DEEPSEEK_CHAT);
};

/**
 * DeepSeek Provider
 * Wraps DeepSeek's OpenAI-compatible chat completions API.
 * Supports `deepseek-chat` (V3) and `deepseek-reasoner` (R1).
 */
export class DeepSeekProvider extends BaseProvider {
  private model: LanguageModel;
  private apiKey: string;
  private baseURL: string;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["deepseek"],
  ) {
    const validatedNeurolink =
      sdk && typeof sdk === "object" && "getInMemoryServers" in sdk
        ? sdk
        : undefined;

    super(
      modelName,
      "deepseek" as AIProviderName,
      validatedNeurolink as NeuroLink | undefined,
    );

    this.apiKey = credentials?.apiKey ?? getDeepSeekApiKey();
    this.baseURL =
      credentials?.baseURL ??
      process.env.DEEPSEEK_BASE_URL ??
      DEEPSEEK_DEFAULT_BASE_URL;

    const deepseek = createOpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      fetch: createProxyFetch(),
    });
    // `.chat()` targets /v1/chat/completions. The default factory call
    // (`deepseek(modelId)`) hits the Responses API, which DeepSeek doesn't
    // implement.
    this.model = deepseek.chat(this.modelName);

    logger.debug("DeepSeek Provider initialized", {
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

      // For deepseek-chat (not the reasoner), thinking mode is opt-in. Only
      // forward the `thinking: { type: "enabled" }` flag when the caller
      // explicitly requests it via `options.thinkingConfig.enabled`. Forcing
      // it on every chat call would slow down simple prompts and ignore the
      // reasoner model's native control of reasoning.
      const isReasoner = this.modelName === DeepSeekModels.DEEPSEEK_REASONER;
      const providerOptions: Record<string, unknown> = {};
      if (!isReasoner && options.thinkingConfig?.enabled) {
        providerOptions.openai = { thinking: { type: "enabled" } };
      }

      const result = await streamText({
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
        providerOptions: Object.keys(providerOptions).length
          ? providerOptions
          : undefined,
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
            logger.warn("[DeepSeekProvider] Failed to store tool executions", {
              provider: this.providerName,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        },
      });

      timeoutController?.cleanup();
      const transformedStream = this.createTextStream(result);
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName,
        toAnalyticsStreamResult(result),
        Date.now() - startTime,
        {
          requestId: `deepseek-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName,
        analytics: analyticsPromise,
        metadata: { startTime, streamId: `deepseek-${Date.now()}` },
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
    return getDefaultDeepSeekModel();
  }

  protected getAISDKModel(): LanguageModel {
    return this.model;
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new Error(`DeepSeek request timed out: ${error.message}`);
    }
    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";

    if (
      message.includes("Invalid API key") ||
      message.includes("Authentication") ||
      message.includes("401")
    ) {
      return new Error(
        "Invalid DeepSeek API key. Please check your DEEPSEEK_API_KEY environment variable.",
      );
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return new Error("DeepSeek rate limit exceeded");
    }
    if (message.includes("model_not_found") || message.includes("404")) {
      return new Error(
        `DeepSeek model '${this.modelName}' not found. Use 'deepseek-chat' or 'deepseek-reasoner'.`,
      );
    }
    return new Error(`DeepSeek error: ${message}`);
  }

  async validateConfiguration(): Promise<boolean> {
    // Honor constructor-resolved credentials (this.apiKey, populated from
    // per-call credentials → env → fallback). Re-reading env via the
    // getter would silently ignore credentials passed through the SDK.
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName,
      defaultModel: getDefaultDeepSeekModel(),
      baseURL: this.baseURL,
    };
  }
}

export default DeepSeekProvider;
```

## Edge cases & special handling

1. **`deepseek-chat` vs `deepseek-reasoner` thinking**: The source repo (`request.py:27`) only adds `extra_body.thinking={type:enabled}` when the model is NOT `deepseek-reasoner`. The reasoner has reasoning baked in.
2. **Reasoning content**: AI SDK v6 surfaces `reasoning_content` as `reasoning` parts on the result; no special parsing needed in our code.
3. **Tool calling on `deepseek-reasoner`**: DeepSeek docs note tool support is limited on R1; we don't restrict it (let the API surface errors).
4. **Base URL nuance**: DeepSeek's API works at both `https://api.deepseek.com` and `https://api.deepseek.com/v1`. The OpenAI client adds the path properly. Use the no-`/v1` form to match the source repo and avoid double-`/v1` issues.

## Smoke test

```bash
export DEEPSEEK_API_KEY="sk-..."
pnpm run build:cli
pnpm run cli generate "Explain entropy in one sentence" --provider deepseek
pnpm run cli generate "Use Python to compute 17!" --provider deepseek --model deepseek-reasoner
```

Expected: text response. With `deepseek-reasoner`, expect a longer latency and `reasoning` parts in the JSON output if `--debug` is used.

## Per-call credential override test

```ts
const nl = new NeuroLink();
const result = await nl.generate({
  input: { text: "hi" },
  provider: "deepseek",
  credentials: { deepseek: { apiKey: "sk-user-supplied" } },
});
```

## Cross-references

- Shared file edits: `01-shared-changes.md` §1b (DeepSeekModels enum), §2 (credentials), §3 (createDeepSeekConfig), §4 (registry), §5 (barrel), §7 (context window), §9 (.env)
- Tests: `06-testing.md`
