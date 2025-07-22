import { createAzure } from "@ai-sdk/azure";
import { streamText } from "ai";
import { BaseProvider } from "../core/base-provider.js";
import type {
  AIProviderName,
  TextGenerationOptions,
  EnhancedGenerateResult,
} from "../core/types.js";
import type { StreamOptions, StreamResult } from "../types/stream-types.js";

export class AzureOpenAIProvider extends BaseProvider {
  private apiKey: string;
  private resourceName: string;
  private deployment: string;
  private apiVersion: string;
  private azureProvider: any;

  constructor(modelName?: string) {
    super(modelName, "azure" as AIProviderName);

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

    if (!this.apiKey) {
      throw new Error("AZURE_OPENAI_API_KEY environment variable is required");
    }
    if (!this.resourceName) {
      throw new Error("AZURE_OPENAI_ENDPOINT environment variable is required");
    }

    // Create the Azure provider instance
    this.azureProvider = createAzure({
      resourceName: this.resourceName,
      apiKey: this.apiKey,
      apiVersion: this.apiVersion,
    });

    console.log("Azure Vercel Provider initialized", {
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
  protected getAISDKModel(): any {
    return this.azureProvider(this.deployment);
  }

  protected handleProviderError(error: any): Error {
    if (error?.message?.includes("401")) {
      return new Error("Invalid Azure OpenAI API key or endpoint.");
    }
    return new Error(
      `Azure OpenAI error: ${error?.message || "Unknown error"}`,
    );
  }

  // executeGenerate removed - BaseProvider handles all generation with tools

  protected async executeStream(
    options: StreamOptions,
    analysisSchema?: any,
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
    } catch (error: any) {
      throw this.handleProviderError(error);
    }
  }
}

export default AzureOpenAIProvider;
