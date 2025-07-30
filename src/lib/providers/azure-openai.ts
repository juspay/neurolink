import { createAzure } from "@ai-sdk/azure";
import { streamText, type LanguageModelV1 } from "ai";
import { BaseProvider, type NeuroLinkSDK } from "../core/base-provider.js";
import type {
  AIProviderName,
  TextGenerationOptions,
  EnhancedGenerateResult,
} from "../core/types.js";
import type { StreamOptions, StreamResult } from "../types/stream-types.js";
import type { Unknown, UnknownRecord } from "../types/common.js";
import {
  validateApiKey,
  createAzureAPIKeyConfig,
  createAzureEndpointConfig,
} from "../utils/providerConfig.js";
import { logger } from "../utils/logger.js";

export class AzureOpenAIProvider extends BaseProvider {
  private apiKey: string;
  private resourceName: string;
  private deployment: string;
  private apiVersion: string;
  private azureProvider: ReturnType<typeof createAzure>;

  constructor(modelName?: string, sdk?: unknown) {
    super(
      modelName,
      "azure" as AIProviderName,
      sdk as NeuroLinkSDK | undefined,
    );

    this.apiKey = process.env.AZURE_OPENAI_API_KEY || "";
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "";
    this.resourceName = endpoint
      .replace("https://", "")
      .replace(/\/+$/, "") // Remove trailing slashes
      .replace(".openai.azure.com", "");
    this.deployment =
      modelName ||
      process.env.AZURE_OPENAI_DEPLOYMENT ||
      process.env.AZURE_OPENAI_DEPLOYMENT_ID ||
      "gpt-4o";
    this.apiVersion = process.env.AZURE_API_VERSION || "2024-10-01-preview";

    // Configuration validation - now using consolidated utility
    if (!this.apiKey) {
      validateApiKey(createAzureAPIKeyConfig());
    }
    if (!this.resourceName) {
      validateApiKey(createAzureEndpointConfig());
    }

    // Create the Azure provider instance
    this.azureProvider = createAzure({
      resourceName: this.resourceName,
      apiKey: this.apiKey,
      apiVersion: this.apiVersion,
    });

    logger.debug("Azure Vercel Provider initialized", {
      deployment: this.deployment,
      resourceName: this.resourceName,
      provider: "azure-vercel",
    });
  }

  protected getProviderName(): AIProviderName {
    return "azure" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return this.deployment;
  }

  /**
   * Returns the Vercel AI SDK model instance for Azure OpenAI
   */
  protected getAISDKModel(): LanguageModelV1 {
    return this.azureProvider(this.deployment);
  }

  protected handleProviderError(error: unknown): Error {
    const errorObj = error as UnknownRecord;
    if (
      errorObj?.message &&
      typeof errorObj.message === "string" &&
      errorObj.message.includes("401")
    ) {
      return new Error("Invalid Azure OpenAI API key or endpoint.");
    }
    const message =
      errorObj?.message && typeof errorObj.message === "string"
        ? errorObj.message
        : "Unknown error";
    return new Error(`Azure OpenAI error: ${message}`);
  }

  // executeGenerate removed - BaseProvider handles all generation with tools

  protected async executeStream(
    options: StreamOptions,
    analysisSchema?: unknown,
  ): Promise<StreamResult> {
    try {
      const stream = await streamText({
        model: this.azureProvider(this.deployment),
        prompt: options.input?.text || "",
        maxTokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        system: options.systemPrompt,
      });

      return {
        stream: (async function* () {
          for await (const chunk of stream.textStream) {
            yield { content: chunk };
          }
        })(),
        provider: "azure",
        model: this.deployment,
        metadata: {
          streamId: `azure-${Date.now()}`,
          startTime: Date.now(),
        },
      };
    } catch (error: unknown) {
      throw this.handleProviderError(error);
    }
  }
}

export default AzureOpenAIProvider;
