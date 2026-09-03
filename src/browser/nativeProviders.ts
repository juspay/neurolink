/**
 * Native provider factories for the browser bundle.
 *
 * These stand in for `createAnthropic` / `createOpenAI` / `createMistral`,
 * which used to be re-exported straight from `@ai-sdk/anthropic`,
 * `@ai-sdk/openai` and `@ai-sdk/mistral`. Those three packages existed in the
 * dependency graph for these six exports and nothing else, so replacing them
 * here is what lets them leave `package.json`.
 *
 * The public shape is unchanged: call the factory with optional settings, then
 * call the result with a model id (or via `.languageModel(id)` / `.chat(id)`)
 * to get a model handle.
 *
 * Model resolution goes through `AIProviderFactory`, so these factories inherit
 * the same native wire clients the SDK already uses — Anthropic's own delegating
 * model and the OpenAI-compatible base's `buildDelegatingModel`. Because that
 * resolution is asynchronous and the factory call is not, the returned handle is
 * a thin lazy shell that resolves the real model on first `doGenerate` /
 * `doStream` and caches it.
 */

import { AIProviderFactory } from "../lib/core/factory.js";
import type {
  NeurolinkCredentials,
  SageMakerAsLanguageModel,
} from "../lib/types/index.js";

/**
 * Runtime narrowing to the structural model shape. `getModel()` is typed as the
 * `LanguageModel` union, which includes a bare string id, so a guard rather than
 * an assertion is what keeps this honest.
 */
const isModelObject = (value: unknown): value is SageMakerAsLanguageModel =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { doGenerate?: unknown }).doGenerate === "function";

const hasGetModel = (
  value: unknown,
): value is { getModel: () => unknown | Promise<unknown> } =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { getModel?: unknown }).getModel === "function";

const lazyModel = (
  providerName: string,
  modelId: string,
  credentials?: NeurolinkCredentials,
): SageMakerAsLanguageModel => {
  let pending: Promise<SageMakerAsLanguageModel> | undefined;

  const resolveModel = async (): Promise<SageMakerAsLanguageModel> => {
    // MCP stays off: the browser bundle has no subprocess transport.
    const provider = await AIProviderFactory.createProvider(
      providerName,
      modelId,
      false,
      undefined,
      undefined,
      credentials,
    );
    if (!hasGetModel(provider)) {
      throw new Error(
        `[NeuroLink:browser] provider "${providerName}" exposes no getModel()`,
      );
    }
    const model = await provider.getModel();
    if (!isModelObject(model)) {
      throw new Error(
        `[NeuroLink:browser] provider "${providerName}" resolved a model handle that cannot generate`,
      );
    }
    return model;
  };

  const target = (): Promise<SageMakerAsLanguageModel> =>
    (pending ??= resolveModel());

  return {
    specificationVersion: "v3",
    provider: providerName,
    modelId,
    supportedUrls: {},
    doGenerate: async (options: Record<string, unknown>): Promise<unknown> =>
      (await target()).doGenerate(options),
    doStream: async (options: Record<string, unknown>): Promise<unknown> =>
      (await target()).doStream(options),
  };
};

const makeFactory = (providerName: string, defaultModelId: string) => {
  const create = (
    settings: {
      credentials?: NeurolinkCredentials;
      apiKey?: string;
      /**
       * Endpoint override, for providers whose credentials entry supports one
       * (OpenAI, Mistral). Without it `createOpenAI({ baseURL })` had nowhere
       * to put the endpoint, so a self-hosted or proxied deployment silently
       * went to the vendor's default host.
       */
      baseURL?: string;
    } = {},
  ) => {
    const credentials =
      settings.credentials ??
      (settings.apiKey || settings.baseURL
        ? ({
            [providerName]: {
              ...(settings.apiKey ? { apiKey: settings.apiKey } : {}),
              ...(settings.baseURL ? { baseURL: settings.baseURL } : {}),
            },
          } as NeurolinkCredentials)
        : undefined);

    const build = (
      modelId: string = defaultModelId,
    ): SageMakerAsLanguageModel =>
      lazyModel(providerName, modelId, credentials);

    return Object.assign(build, {
      languageModel: build,
      chat: build,
      provider: providerName,
    });
  };
  return create;
};

export const createAnthropic = makeFactory("anthropic", "claude-sonnet-4-5");
export const anthropic = createAnthropic();

export const createOpenAI = makeFactory("openai", "gpt-4o-mini");
export const openai = createOpenAI();

export const createMistral = makeFactory("mistral", "mistral-small-latest");
export const mistral = createMistral();
