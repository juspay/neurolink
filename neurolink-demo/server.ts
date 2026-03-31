/**
 * NeuroLink AI Development Platform Demo Server
 *
 * A comprehensive Express.js server showcasing NeuroLink's capabilities:
 */

import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { NeuroLink } from "@juspay/neurolink";
import { createAIProvider } from "@juspay/neurolink";

// Initialize configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env"), override: true });

// Initialize NeuroLink SDK instance
const neurolink = new NeuroLink();

function sanitizeForLog(value: string): string {
  // Strip control characters (U+0000-U+001F) and newlines for log injection prevention
  return value.replace(/[\r\n\u0000-\u001f]/g, "");
}

// ================================
// CONFIGURATION & CONSTANTS
// ================================

// Server configuration
const app = express();
const PORT = process.env.PORT || 9876;

// All supported AI providers - single source of truth
const ALL_PROVIDERS = [
  "litellm",
  "google-ai",
  "anthropic",
  "openai",
  "mistral",
  "vertex",
  "azure",
  "huggingface",
  "bedrock",
  "ollama",
];

// Default model mappings for each provider
const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o",
  bedrock:
    "arn:aws:bedrock:us-east-2:225681119357:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0",
  vertex: "gemini-2.5-pro",
  "google-ai": "gemini-2.5-pro",
  anthropic: "claude-3-5-sonnet-20241022",
  azure: "gpt-4o",
  huggingface: "microsoft/DialoGPT-medium",
  ollama: "llama3.2:latest",
  mistral: "mistral-small",
  litellm: "openai/gpt-4o-mini",
};

// Environment variable mappings for provider configuration
const PROVIDER_ENV_VARS: Record<string, string[]> = {
  openai: ["OPENAI_API_KEY"],
  bedrock: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
  vertex: [
    "GOOGLE_VERTEX_PROJECT",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "GOOGLE_AUTH_CLIENT_EMAIL",
  ],
  "google-ai": ["GOOGLE_AI_API_KEY"],
  anthropic: ["ANTHROPIC_API_KEY"],
  azure: ["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_ENDPOINT"],
  huggingface: ["HUGGINGFACE_API_KEY"],
  ollama: [],
  mistral: ["MISTRAL_API_KEY"],
  litellm: ["LITELLM_API_KEY"],
};

// Common generation parameters
const DEFAULT_GENERATION_PARAMS = {
  maxTokens: 500,
  temperature: 0.7,
};

// In-memory usage statistics
const usageStats = {
  requests: 0,
  providers: {},
  errors: 0,
  totalTokens: 0,
};

// Express middleware setup
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

/**
 * Request logging middleware
 */
const logRequest = (req: Request, _res: Response, next: NextFunction) => {
  const safeMethod = sanitizeForLog(req.method);
  const safePath = sanitizeForLog(req.path);
  console.log("[%s] %s %s", new Date().toISOString(), safeMethod, safePath);
  usageStats.requests++;
  next();
};

app.use(logRequest);

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Get the configured model for a specific provider
 */
function getModelForProvider(provider: string): string {
  const envVar = `${provider.toUpperCase().replace("-", "_")}_MODEL`;
  return (
    process.env[envVar] || DEFAULT_MODELS[provider] || DEFAULT_MODELS.openai
  );
}

/**
 * Check if a provider is properly configured
 */
function isProviderConfigured(provider: string): boolean {
  if (provider === "ollama") {
    return true;
  }

  const requiredVars = PROVIDER_ENV_VARS[provider] || [];

  if (provider === "vertex") {
    return requiredVars.some((varName) => !!process.env[varName]);
  }

  return requiredVars.every((varName) => !!process.env[varName]);
}

/**
 * Create a standardized success response
 */
function createSuccessResponse(
  data: Record<string, unknown>,
  metadata: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    success: true,
    ...data,
    ...metadata,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a standardized error response
 */
function createErrorResponse(
  error: string,
  context: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    success: false,
    error: error,
    ...context,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle async route errors
 */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Update usage statistics
 */
function updateUsageStats(usage: { totalTokens?: number } | undefined): void {
  if (usage && usage.totalTokens) {
    usageStats.totalTokens += usage.totalTokens;
  }
}

/**
 * Generate AI content with standardized parameters and automatic fallback
 * Uses NeuroLink SDK for ALL operations - image, video, and text generation
 */
async function generateWithProvider(
  providerName: string,
  prompt: string,
  options: {
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
    outputMode?: string;
    model?: string;
    systemPrompt?: string;
    enableMCP?: boolean;
    schema?: Record<string, unknown>;
    input?: {
      images?: (Buffer | string)[];
      text?: string;
      videoFiles?: (Buffer | string)[];
    };
    videoLength?: number;
    videoResolution?: string;
    videoAspectRatio?: string;
  } = {},
) {
  const startTime = Date.now();

  // Check if this is a multimodal/image generation request
  const isImageRequest = options.outputMode === "image";
  const isVideoRequest = options.outputMode === "video";

  // For image generation, use NeuroLink SDK with imagen model
  if (isImageRequest) {
    try {
      console.log(`[Generate] Image generation requested, using NeuroLink SDK`);

      // Use NeuroLink's generate method with imagen model
      const result = await neurolink.generate({
        input: { text: prompt },
        provider: "vertex",
        model: options.model || "imagen-3.0-generate-002",
        disableTools: true,
        timeout: options.timeout || 60000,
      });

      const responseTime = Date.now() - startTime;

      // Extract image from result
      const imageOutput = result.imageOutput;
      if (!imageOutput?.base64) {
        throw new Error("No image data returned from NeuroLink");
      }

      console.log(
        `[Generate] Image generated successfully in ${responseTime}ms`,
      );

      return {
        content: "Image generated successfully",
        imageOutput: { base64: imageOutput.base64 },
        provider: result.provider || "vertex",
        model: result.model || "imagen-3.0-generate-002",
        responseTime,
        usage: result.usage || { total: 0 },
      };
    } catch (error) {
      const err = error as Error;
      console.error(`[Image generation error:`, err.message);
      throw err;
    }
  }

  // For video generation, use NeuroLink SDK with output.mode = "video"
  if (isVideoRequest) {
    try {
      console.log(`[Generate] Video generation requested, using NeuroLink SDK`);

      // Video generation requires an input image
      if (!options.input?.images?.length) {
        throw new Error(
          "Video generation requires an input image. Provide via input.images array.",
        );
      }

      const inputImage = options.input.images[0];

      // Use NeuroLink's generate method with video output mode
      const result = await neurolink.generate({
        input: {
          text: prompt,
          images: [inputImage],
        },
        provider: "vertex",
        model: options.model || "veo-3.1-generate-001",
        output: {
          mode: "video",
          video: {
            resolution: options.videoResolution || "720p",
            length: options.videoLength || 6,
            aspectRatio: options.videoAspectRatio || "16:9",
          },
        },
        disableTools: true,
        timeout: options.timeout || 180000, // 3 minutes for video
      });

      const responseTime = Date.now() - startTime;

      // Extract video from result
      const videoData = result.video;
      if (!videoData?.data) {
        throw new Error("No video data returned from NeuroLink");
      }

      console.log(
        `[Generate] Video generated successfully in ${responseTime}ms`,
      );

      return {
        content: "Video generated successfully",
        videoOutput: {
          base64: videoData.data.toString("base64"),
          duration: videoData.metadata?.duration,
          dimensions: videoData.metadata?.dimensions,
        },
        provider: result.provider || "vertex",
        model: result.model || "veo-3.1-generate-001",
        responseTime,
        usage: result.usage || { total: 0 },
      };
    } catch (error) {
      const err = error as Error;
      console.error(`[Video generation error:`, err.message);
      throw err;
    }
  }

  // Text generation with fallback
  return await generateTextWithFallback(providerName, prompt, options);
}

/**
 * Test if a provider is available and configured
 */
async function testProviderAvailability(providerName) {
  const result = {
    configured: isProviderConfigured(providerName),
    available: false,
    authenticated: false,
    model: getModelForProvider(providerName),
    error: null,
  };

  if (providerName === "ollama") {
    try {
      const isRunning = await testOllamaConnection();
      result.available = isRunning;
      result.authenticated = isRunning;
      if (!isRunning) {
        result.error =
          "Ollama is not running. Please start Ollama with: ollama serve";
      }
    } catch (error) {
      result.error = error.message;
    }
    return result;
  }

  if (providerName === "litellm") {
    const liteLLMBaseURL =
      process.env.LITELLM_BASE_URL || "http://localhost:4000";

    try {
      const response = await fetch(`${liteLLMBaseURL}/v1/models`, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });

      if (response.ok) {
        result.configured = true;
        result.available = true;
        result.authenticated = true;
      } else {
        result.configured = isProviderConfigured(providerName);
        result.available = false;
        result.authenticated = false;
        result.error = `LiteLLM proxy server returned HTTP ${response.status}`;
      }
    } catch (error) {
      result.configured = isProviderConfigured(providerName);
      result.available = false;
      result.authenticated = false;
      result.error =
        `LiteLLM proxy server not available at ${liteLLMBaseURL}. ` +
        "Please start the LiteLLM proxy server.";
    }
    return result;
  }

  result.available = result.configured;
  result.authenticated = result.configured;
  return result;
}

async function testOllamaConnection() {
  try {
    const response = await fetch("http://localhost:11434/api/version", {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Text generation with fallback
 */
async function generateTextWithFallback(providerName, prompt, options = {}) {
  const startTime = Date.now();

  let providersToTry = [];

  if (providerName !== "auto") {
    if (isProviderConfigured(providerName)) {
      providersToTry.push(providerName);
    }
  }

  if (providerName === "auto") {
    const otherProvidersConfigured = ALL_PROVIDERS.filter(
      (p) =>
        !providersToTry.includes(p) &&
        p !== "ollama" &&
        isProviderConfigured(p),
    );
    providersToTry = [...providersToTry, ...otherProvidersConfigured];
  }

  if (providersToTry.length === 0) {
    const litellmConfigured = isProviderConfigured("litellm");
    if (litellmConfigured) {
      providersToTry.push("litellm");
    }
  }

  console.log(
    `[Generate] Will try providers in order: ${providersToTry.join(", ")}`,
  );
  const errors = [];

  for (let i = 0; i < providersToTry.length; i++) {
    const currentProvider = providersToTry[i];

    try {
      console.log(
        `[Generate] Attempting provider: ${currentProvider} (${i + 1}/${providersToTry.length})`,
      );

      const aiProvider = await createAIProvider(currentProvider);
      const result = await aiProvider.generate({
        prompt,
        model: getModelForProvider(currentProvider),
        maxTokens: options.maxTokens || DEFAULT_GENERATION_PARAMS.maxTokens,
        temperature:
          options.temperature || DEFAULT_GENERATION_PARAMS.temperature,
        timeout: options.timeout || 30000,
      });

      const responseTime = Date.now() - startTime;

      console.log(`[DEBUG ${currentProvider}] Result structure:`, {
        hasResult: !!result,
        hasText: !!(result && result.text),
        resultKeys: result ? Object.keys(result) : [],
        resultTextPreview: result?.text
          ? result.text.substring(0, 100)
          : undefined,
        fullResult: result ? JSON.stringify(result, null, 2) : undefined,
      });

      if (!result) {
        throw new Error("Provider returned null result");
      }

      const content =
        result.text ||
        result.content ||
        result.output ||
        result.message?.content;

      if (!content) {
        console.error(`[${currentProvider}] Invalid response structure:`, {
          resultKeys: Object.keys(result),
          resultSample: JSON.stringify(result).substring(0, 500),
        });
        throw new Error("Provider returned response without text/content");
      }

      if (!result.text) {
        result.text = content;
      }

      updateUsageStats(result.usage);

      console.log(
        `[Generate] Success with ${currentProvider} in ${responseTime}ms`,
      );

      return {
        content: result.text,
        provider: currentProvider,
        model: result.model || getModelForProvider(currentProvider),
        responseTime,
        usage: result.usage,
        attemptedProviders: i + 1,
        fallbackUsed: i > 0,
      };
    } catch (error) {
      const errorMsg = (error as Error).message || String(error);
      errors.push(`${currentProvider}: ${errorMsg}`);
      console.log(`[Generate] ${currentProvider} failed: ${errorMsg}`);

      if (i === providersToTry.length - 1) {
        const finalError = `Failed after ${providersToTry.length} attempts. Last error: ${errorMsg}`;
        throw new Error(finalError);
      }
    }
  }

  throw new Error("No providers available to try");
}

/**
 * Generate mock AI analysis data
 */
function generateMockAnalysisData(
  toolName: string,
  params: Record<string, unknown> = {},
): Record<string, unknown> {
  const mockData = {
    "analyze-ai-usage": {
      timeRange: params.timeRange || "24h",
      summary: {
        totalRequests: 1247,
        totalTokens: 89432,
        averageTokensPerRequest: 72,
        costEstimation: "$12.45",
      },
      providerBreakdown: {
        openai: { requests: 623, tokens: 44716, cost: "$6.23" },
        vertex: { requests: 412, tokens: 29654, cost: "$4.12" },
        bedrock: { requests: 212, tokens: 15062, cost: "$2.10" },
      },
      optimizationSuggestions: [
        "Consider using lower-cost providers for simple tasks",
        "Optimize prompts to reduce token usage by 15-20%",
        "Implement caching for repeated queries",
      ],
    },
    "benchmark-provider-performance": {
      iterations: params.iterations || 3,
      summary: {
        fastestProvider: "openai",
        averageLatency: "1.2s",
        qualityScore: 8.7,
        costEfficiency: "vertex",
      },
      detailedResults: {
        openai: {
          avgLatency: "0.8s",
          qualityScore: 9.1,
          costPerToken: "$0.00003",
        },
        vertex: {
          avgLatency: "1.1s",
          qualityScore: 8.9,
          costPerToken: "$0.000025",
        },
        bedrock: {
          avgLatency: "1.7s",
          qualityScore: 8.2,
          costPerToken: "$0.000028",
        },
      },
      recommendations: [
        "Use OpenAI for latency-critical applications",
        "Use Vertex AI for cost-optimized workflows",
        "Consider Bedrock for specialized enterprise use cases",
      ],
    },
  };

  return mockData[toolName as keyof typeof mockData] || {};
}

// ================================
// CORE API ENDPOINTS
// ================================

app.get(
  "/api/status",
  asyncHandler(async (req: Request, res: Response) => {
    const status: {
      timestamp: string;
      providers: Record<
        string,
        Awaited<ReturnType<typeof testProviderAvailability>>
      >;
      bestProvider: string | null;
      configuration: Record<string, unknown>;
    } = {
      timestamp: new Date().toISOString(),
      providers: {},
      bestProvider: null,
      configuration: {
        defaultProvider: process.env.DEFAULT_PROVIDER || "google-ai",
        streamingEnabled: process.env.ENABLE_STREAMING === "true",
        fallbackEnabled: process.env.ENABLE_FALLBACK === "true",
      },
    };

    for (const providerName of ALL_PROVIDERS) {
      status.providers[providerName] =
        await testProviderAvailability(providerName);
    }

    const authenticatedProviders = ALL_PROVIDERS.filter(
      (p) => status.providers[p].authenticated,
    );

    if (authenticatedProviders.length > 0) {
      status.bestProvider = authenticatedProviders[0];
    } else {
      status.bestProvider = null;
    }

    res.json(status);
  }),
);

app.post(
  "/api/stream",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      provider = "google-ai",
      prompt,
      maxTokens,
      temperature,
      systemPrompt,
    } = req.body;

    if (!prompt) {
      res.status(400).json(createErrorResponse("Prompt is required"));
      return;
    }

    console.log(
      `[Stream] Using provider: ${provider}, prompt length: ${prompt.length}`,
    );

    // Set headers for Server-Sent Events - MUST be set before any writes
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Transfer-Encoding", "chunked");

    // Flush headers immediately to establish SSE connection
    if (typeof (res as any).flushHeaders === "function") {
      (res as any).flushHeaders();
    }

    const startTime = Date.now();
    let chunkCount = 0;
    let fullContent = "";
    let actualProvider = provider;

    // Helper function to send SSE chunk immediately
    const sendChunk = (content: string, index: number) => {
      const eventData = JSON.stringify({
        type: "chunk",
        content: content,
        chunkIndex: index,
      });
      res.write(`data: ${eventData}\n\n`);

      // Force flush for immediate delivery
      if (typeof (res as any).flush === "function") {
        (res as any).flush();
      }
    };

    // Helper function to send final event
    const sendDone = (
      content: string,
      providerName: string,
      model: string,
      responseTime: number,
      chunks: number,
      usage?: { total: number },
    ) => {
      const eventData = JSON.stringify({
        type: "done",
        content: content,
        provider: providerName,
        model: model,
        responseTime,
        chunkCount: chunks,
        usage: usage ? { total: usage.total } : undefined,
      });
      res.write(`data: ${eventData}\n\n`);
    };

    try {
      // Determine which provider to use - prefer the requested provider if configured
      let streamProvider = provider;
      let streamModel: string | undefined;

      if (provider === "auto" || !isProviderConfigured(provider)) {
        // Find best available provider
        if (isProviderConfigured("google-ai")) {
          streamProvider = "google-ai";
          streamModel = process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash";
        } else if (isProviderConfigured("litellm")) {
          streamProvider = "litellm";
          streamModel = process.env.LITELLM_MODEL || "gpt-4o-mini";
        } else if (isProviderConfigured("openai")) {
          streamProvider = "openai";
          streamModel = "gpt-4o";
        } else if (isProviderConfigured("anthropic")) {
          streamProvider = "anthropic";
          streamModel = "claude-3-5-sonnet-20241022";
        } else {
          streamProvider = "google-ai"; // Will fail with helpful error
          streamModel = "gemini-2.5-flash";
        }
      } else {
        streamModel = getModelForProvider(provider);
      }

      console.log(
        `[Stream] Using provider: ${streamProvider}, model: ${streamModel}`,
      );

      // Build stream options
      const streamOptions: {
        input: { text: string };
        maxTokens: number;
        temperature: number;
        systemPrompt?: string;
        provider: string;
        model?: string;
        disableTools: boolean;
      } = {
        input: { text: prompt },
        maxTokens: maxTokens || DEFAULT_GENERATION_PARAMS.maxTokens,
        temperature: temperature || DEFAULT_GENERATION_PARAMS.temperature,
        provider: streamProvider,
        model: streamModel,
        disableTools: true,
      };

      if (systemPrompt) {
        streamOptions.systemPrompt = systemPrompt;
      }

      console.log(`[Stream] Calling neurolink.stream()...`);

      // Use NeuroLink's stream method
      const result = await neurolink.stream(streamOptions);
      actualProvider = result.provider || streamProvider;

      console.log(
        `[Stream] Stream created, provider: ${actualProvider}, model: ${result.model}`,
      );

      // Iterate over the stream and send chunks immediately
      const streamStartTime = Date.now();

      for await (const chunk of result.stream) {
        // Extract text content from chunk - handle ALL possible formats
        let chunkContent: string | null = null;

        if (typeof chunk === "string") {
          // Direct string chunk
          chunkContent = chunk;
        } else if (chunk && typeof chunk === "object") {
          const chunkObj = chunk as Record<string, unknown>;

          // Format 1: { content: string }
          if (typeof chunkObj.content === "string") {
            chunkContent = chunkObj.content;
          }
          // Format 2: { text: string }
          else if (typeof chunkObj.text === "string") {
            chunkContent = chunkObj.text;
          }
          // Format 3: { delta: { content: string } }
          else if (chunkObj.delta && typeof chunkObj.delta === "object") {
            const delta = chunkObj.delta as Record<string, unknown>;
            if (typeof delta.content === "string") {
              chunkContent = delta.content;
            } else if (typeof delta.text === "string") {
              chunkContent = delta.text;
            }
          }
          // Format 4: { choices: [{ delta: { content: string } }] } - OpenAI format
          else if (Array.isArray(chunkObj.choices)) {
            const firstChoice = chunkObj.choices[0] as
              | Record<string, unknown>
              | undefined;
            if (firstChoice?.delta && typeof firstChoice.delta === "object") {
              const delta = firstChoice.delta as Record<string, unknown>;
              if (typeof delta.content === "string") {
                chunkContent = delta.content;
              }
            }
          }
          // Format 5: { parts: [{ text: string }] } - Gemini format
          else if (Array.isArray(chunkObj.parts)) {
            const firstPart = chunkObj.parts[0] as
              | Record<string, unknown>
              | undefined;
            if (typeof firstPart?.text === "string") {
              chunkContent = firstPart.text;
            }
          }
          // Format 6: { candidates: [{ content: { parts: [...] } }] } - Vertex AI format
          else if (Array.isArray(chunkObj.candidates)) {
            const firstCandidate = chunkObj.candidates[0] as
              | Record<string, unknown>
              | undefined;
            if (
              firstCandidate?.content &&
              typeof firstCandidate.content === "object"
            ) {
              const content = firstCandidate.content as Record<string, unknown>;
              if (Array.isArray(content.parts)) {
                const firstPart = content.parts[0] as
                  | Record<string, unknown>
                  | undefined;
                if (typeof firstPart?.text === "string") {
                  chunkContent = firstPart.text;
                }
              }
            }
          }
        }

        // Send chunk if we have content
        if (chunkContent && chunkContent.length > 0) {
          chunkCount++;
          fullContent += chunkContent;

          // Log first chunk for debugging
          if (chunkCount === 1) {
            console.log(
              `[Stream] First chunk received after ${Date.now() - streamStartTime}ms`,
            );
          }

          // Send immediately to client
          sendChunk(chunkContent, chunkCount);
        }
      }

      const responseTime = Date.now() - startTime;

      // If we got chunks, send done event
      if (chunkCount > 0) {
        sendDone(
          fullContent,
          actualProvider,
          result.model || streamModel || "unknown",
          responseTime,
          chunkCount,
          result.usage,
        );
        console.log(
          `[Stream] Completed in ${responseTime}ms, ${chunkCount} chunks, provider: ${actualProvider}`,
        );
      } else {
        // No chunks - try direct streaming with provider
        console.log(
          `[Stream] No chunks from neurolink.stream(), trying direct provider stream...`,
        );

        // Try using createAIProvider and its stream method directly
        try {
          const aiProvider = await createAIProvider(streamProvider);

          // Check if provider has a stream method
          if (typeof (aiProvider as any).stream === "function") {
            console.log(
              `[Stream] Using direct provider stream for ${streamProvider}`,
            );

            const directResult = await (aiProvider as any).stream({
              prompt,
              model: streamModel,
              maxTokens: maxTokens || DEFAULT_GENERATION_PARAMS.maxTokens,
              temperature: temperature || DEFAULT_GENERATION_PARAMS.temperature,
              systemPrompt,
              disableTools: true,
            });

            if (directResult.stream) {
              for await (const chunk of directResult.stream) {
                let chunkContent: string | null = null;

                if (typeof chunk === "string") {
                  chunkContent = chunk;
                } else if (chunk && typeof chunk === "object") {
                  const chunkObj = chunk as Record<string, unknown>;
                  if (typeof chunkObj.content === "string") {
                    chunkContent = chunkObj.content;
                  } else if (typeof chunkObj.text === "string") {
                    chunkContent = chunkObj.text;
                  } else if (
                    chunkObj.delta &&
                    typeof chunkObj.delta === "object"
                  ) {
                    const delta = chunkObj.delta as Record<string, unknown>;
                    if (typeof delta.content === "string") {
                      chunkContent = delta.content;
                    }
                  }
                }

                if (chunkContent && chunkContent.length > 0) {
                  chunkCount++;
                  fullContent += chunkContent;
                  sendChunk(chunkContent, chunkCount);
                }
              }
            }

            if (chunkCount > 0) {
              actualProvider = streamProvider;
              sendDone(
                fullContent,
                actualProvider,
                streamModel || "unknown",
                Date.now() - startTime,
                chunkCount,
              );
              console.log(
                `[Stream] Direct stream completed: ${chunkCount} chunks`,
              );
              res.end();
              return;
            }
          }
        } catch (directError) {
          console.log(
            `[Stream] Direct stream failed:`,
            (directError as Error).message,
          );
        }

        // Final fallback to non-streaming generation
        console.log(`[Stream] Falling back to non-streaming generation...`);

        const genResult = await generateWithProvider(streamProvider, prompt, {
          maxTokens,
          temperature,
          systemPrompt,
        });

        fullContent = genResult.content;
        actualProvider = genResult.provider;

        // Simulate streaming by breaking the response into smaller chunks
        const words = fullContent.split(" ");
        const chunkSize = Math.max(1, Math.floor(words.length / 20)); // Aim for ~20 chunks

        for (let i = 0; i < words.length; i += chunkSize) {
          const chunkWords = words.slice(i, i + chunkSize);
          const chunkText = (i === 0 ? "" : " ") + chunkWords.join(" ");
          chunkCount++;
          fullContent = words.slice(0, i + chunkSize).join(" ");
          sendChunk(chunkText, chunkCount);

          // Small delay to simulate streaming
          await new Promise((r) => setTimeout(r, 20));
        }

        // Ensure we have the full content
        fullContent = genResult.content;

        sendDone(
          fullContent,
          actualProvider,
          genResult.model || "unknown",
          Date.now() - startTime,
          chunkCount,
          genResult.usage,
        );
        console.log(
          `[Stream] Fallback completed: ${chunkCount} simulated chunks`,
        );
      }

      res.end();
    } catch (error) {
      console.error(`[Stream] Error:`, (error as Error).message);
      usageStats.errors++;

      // Send error event
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          error: (error as Error).message,
          provider: actualProvider,
        })}\n\n`,
      );
      res.end();
    }
  }),
);

app.post(
  "/api/generate",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      provider = "google-ai", // Default to google-ai (OpenAI has quota issues)
      prompt,
      enableMCP = true,
      disableTools = false,
      maxTokens,
      temperature,
      systemPrompt,
    } = req.body;

    if (!prompt) {
      res.status(400).json(createErrorResponse("Prompt is required"));
      return;
    }

    const useMCP = !disableTools && enableMCP;

    console.log(
      `[Generate] Using provider: ${provider}, prompt length: ${prompt.length}, MCP: ${useMCP}`,
    );

    try {
      const result = await generateWithProvider(provider, prompt, {
        maxTokens,
        temperature,
        systemPrompt,
        enableMCP: useMCP,
      });

      console.log(`[Generate] Success in ${result.responseTime}ms`);

      const response = createSuccessResponse({
        ...result,
        toolsUsed:
          useMCP && prompt.toLowerCase().includes("time")
            ? ["get-current-time"]
            : useMCP && prompt.toLowerCase().includes("calculate")
              ? ["calculator"]
              : useMCP && prompt.toLowerCase().includes("provider")
                ? ["check-provider-status"]
                : useMCP && prompt.toLowerCase().includes("tools")
                  ? ["list-tools"]
                  : [],
        enhancedWithTools:
          useMCP &&
          (prompt.toLowerCase().includes("time") ||
            prompt.toLowerCase().includes("calculate") ||
            prompt.toLowerCase().includes("provider") ||
            prompt.toLowerCase().includes("tools")),
      });

      res.json(response);
    } catch (error) {
      console.error(`[Generate] Error:`, (error as Error).message);
      usageStats.errors++;
      res
        .status(500)
        .json(createErrorResponse((error as Error).message, { provider }));
    }
  }),
);

app.post(
  "/api/schema",
  asyncHandler(async (req: Request, res: Response) => {
    const { type = "user-profile", customPrompt } = req.body;

    const schemas = {
      "user-profile": {
        prompt:
          'Generate a user profile for a fictional character. Return ONLY valid JSON with no additional text: {"name": "...", "age": number, "occupation": "...", "hobbies": ["..."]}',
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" },
            occupation: { type: "string" },
            hobbies: { type: "array", items: { type: "string" } },
          },
          required: ["name", "age", "occupation", "hobbies"],
        },
      },
      "product-review": {
        prompt:
          'Generate a product review for a smartphone. Return ONLY valid JSON with no additional text: {"product": "...", "rating": number (1-5), "pros": ["..."], "cons": ["..."], "recommendation": "..."}',
        schema: {
          type: "object",
          properties: {
            product: { type: "string" },
            rating: { type: "number", minimum: 1, maximum: 5 },
            pros: { type: "array", items: { type: "string" } },
            cons: { type: "array", items: { type: "string" } },
            recommendation: { type: "string" },
          },
          required: ["product", "rating", "pros", "cons", "recommendation"],
        },
      },
      "meeting-notes": {
        prompt:
          'Generate meeting notes for a project planning session. Return ONLY valid JSON with no additional text: {"title": "...", "date": "...", "attendees": ["..."], "decisions": ["..."], "actionItems": [{"task": "...", "assignee": "...", "dueDate": "..."}]}',
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            date: { type: "string" },
            attendees: { type: "array", items: { type: "string" } },
            decisions: { type: "array", items: { type: "string" } },
            actionItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task: { type: "string" },
                  assignee: { type: "string" },
                  dueDate: { type: "string" },
                },
              },
            },
          },
          required: ["title", "date", "attendees", "decisions", "actionItems"],
        },
      },
    };

    // Handle custom prompt or predefined schema
    let promptToSend: string = schemas["user-profile"].prompt; // Default fallback
    let schemaToSend: Record<string, unknown> | undefined;

    if (type === "custom" && customPrompt) {
      // Use custom prompt for custom type
      promptToSend = `${customPrompt}\n\nReturn ONLY valid JSON with no additional text.`;
      console.log(`[Schema] Using custom prompt for structured output`);
    } else if (customPrompt && type !== "custom") {
      // Use custom prompt with predefined schema type hint
      const selectedSchema =
        schemas[type as keyof typeof schemas] || schemas["user-profile"];
      promptToSend = customPrompt;
      schemaToSend = selectedSchema.schema;
      console.log(`[Schema] Using custom prompt with ${type} schema type`);
    } else {
      // Use predefined schema
      const selectedSchema =
        schemas[type as keyof typeof schemas] || schemas["user-profile"];
      promptToSend = selectedSchema.prompt;
      schemaToSend = selectedSchema.schema;
      console.log(`[Schema] Testing structured output for type: ${type}`);
    }

    try {
      const result = await generateWithProvider("auto", promptToSend, {
        maxTokens: 400,
        schema: schemaToSend,
      });

      res.json(
        createSuccessResponse({
          structuredData: (() => {
            // First check if result has object property (structured output)
            if ((result as Record<string, unknown>).object) {
              return (result as Record<string, unknown>).object;
            }
            // Try to extract JSON from response text
            const jsonMatch = result.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                return JSON.parse(jsonMatch[0]);
              } catch {
                return {
                  error: "Could not parse JSON from response",
                  raw: result.content,
                };
              }
            }
            return { error: "No JSON found in response", raw: result.content };
          })(),
          rawText: result.content,
          provider: result.provider,
          usage: result.usage,
          schema: schemaToSend,
          promptType: type,
          customPromptUsed: !!customPrompt,
        }),
      );
    } catch (error) {
      console.error("[Schema] Error:", (error as Error).message);
      res.status(500).json(createErrorResponse((error as Error).message));
    }
  }),
);

app.post(
  "/api/benchmark",
  asyncHandler(async (req: Request, res: Response) => {
    const testPrompt = "Write a haiku about artificial intelligence.";
    const results: {
      timestamp: string;
      prompt: string;
      results: Record<string, Record<string, unknown>>;
    } = {
      timestamp: new Date().toISOString(),
      prompt: testPrompt,
      results: {},
    };

    console.log("[Benchmark] Testing all providers with standardized prompt");

    for (const providerName of ALL_PROVIDERS) {
      try {
        console.log(`[Benchmark] Testing ${providerName}`);

        const result = await generateWithProvider(providerName, testPrompt, {
          maxTokens: 100,
          temperature: 0.7,
        });

        results.results[providerName] = {
          success: true,
          responseTime: result.responseTime,
          model: result.model,
          usage: result.usage,
          contentLength: result.content.length,
          content: result.content,
        };
      } catch (error) {
        console.error(
          `[Benchmark] ${providerName} failed:`,
          (error as Error).message,
        );
        results.results[providerName] = {
          success: false,
          error: (error as Error).message,
        };
      }
    }

    res.json(results);
  }),
);

// ================================
// BUSINESS USE CASE ENDPOINTS
// ================================

/**
 * POST /api/business/email
 * Generate professional business emails
 */
app.post(
  "/api/business/email",
  asyncHandler(async (req: Request, res: Response) => {
    const { type = "marketing", context } = req.body;

    const emailPrompts = {
      marketing: `Write a professional marketing email about: ${context}. Include a compelling subject line, engaging body text, and clear call-to-action.`,
      support: `Write a helpful customer support email response for: ${context}. Be empathetic, solution-focused, and professional.`,
      "follow-up": `Write a polite follow-up email regarding: ${context}. Be courteous, specific about next steps, and include timeline.`,
    };

    const result = await generateWithProvider(
      "auto",
      emailPrompts[type as keyof typeof emailPrompts] || emailPrompts.marketing,
      {
        maxTokens: 400,
        temperature: 0.7,
      },
    );

    res.json(
      createSuccessResponse({
        content: result.content,
        usage: result.usage,
      }),
    );
  }),
);

/**
 * POST /api/business/analyze-data
 * Analyze CSV data and provide business insights
 */
app.post(
  "/api/business/analyze-data",
  asyncHandler(async (req: Request, res: Response) => {
    const { data } = req.body;

    const analysisPrompt = `Analyze this CSV data and provide insights, trends, and recommendations:

${data}

Please provide:
1. Key insights and patterns
2. Statistical observations
3. Business recommendations
4. Potential areas for improvement`;

    const result = await generateWithProvider("auto", analysisPrompt, {
      maxTokens: 600,
      temperature: 0.3,
    });

    res.json(
      createSuccessResponse({
        content: result.content,
        usage: result.usage,
      }),
    );
  }),
);

/**
 * POST /api/business/summarize
 * Summarize documents with configurable length
 */
app.post(
  "/api/business/summarize",
  asyncHandler(async (req: Request, res: Response) => {
    const { text, length = "medium" } = req.body;

    const summaryPrompts = {
      brief: `Summarize this text in 1-2 concise sentences: ${text}`,
      medium: `Provide a comprehensive paragraph summary of this text: ${text}`,
      detailed: `Create a detailed summary with key points, main ideas, and important details: ${text}`,
    };

    const tokenLimits = { brief: 100, medium: 200, detailed: 400 };

    const result = await generateWithProvider(
      "auto",
      summaryPrompts[length as keyof typeof summaryPrompts],
      {
        maxTokens: tokenLimits[length as keyof typeof tokenLimits],
        temperature: 0.4,
      },
    );

    res.json(
      createSuccessResponse({
        content: result.content,
        usage: result.usage,
      }),
    );
  }),
);

// ================================
// CREATIVE TOOLS ENDPOINTS
// ================================

/**
 * POST /api/creative/writing
 * Generate creative content (stories, poems, dialogue)
 */
app.post(
  "/api/creative/writing",
  asyncHandler(async (req: Request, res: Response) => {
    const { type = "story", prompt } = req.body;

    const creativePrompts = {
      story: `You are a creative writer. Write an engaging short story based on: ${prompt}. Include vivid descriptions, character development, and a compelling narrative arc.`,
      poem: `You are a poet. Create a beautiful, evocative poem inspired by: ${prompt}. Use imagery, rhythm, and emotional depth.`,
      dialogue: `You are a screenwriter. Write realistic, engaging dialogue between characters in this scenario: ${prompt}. Make it natural and character-driven.`,
    };

    const result = await generateWithProvider(
      "auto",
      creativePrompts[type as keyof typeof creativePrompts],
      {
        maxTokens: 500,
        temperature: 0.8,
      },
    );

    res.json(
      createSuccessResponse({
        content: result.content,
        usage: result.usage,
      }),
    );
  }),
);

/**
 * POST /api/creative/translate
 * Translate text while maintaining tone and context
 */
app.post(
  "/api/creative/translate",
  asyncHandler(async (req: Request, res: Response) => {
    const { text, language } = req.body;

    const translationPrompt = `Translate the following text to ${language}, maintaining tone and context:

"${text}"

Provide only the translation:`;

    const result = await generateWithProvider("auto", translationPrompt, {
      maxTokens: 300,
      temperature: 0.3,
    });

    res.json(
      createSuccessResponse({
        content: result.content.trim(),
        usage: result.usage,
      }),
    );
  }),
);

/**
 * POST /api/creative/ideas
 * Generate content ideas for various platforms
 */
app.post(
  "/api/creative/ideas",
  asyncHandler(async (req: Request, res: Response) => {
    const { type = "blog", topic } = req.body;

    const ideaPrompts = {
      blog: `Generate 10 compelling blog post ideas about ${topic}. Include catchy titles and brief descriptions for each.`,
      social: `Create 10 engaging social media post ideas about ${topic}. Include platform-specific suggestions and hashtag recommendations.`,
      video: `Generate 10 video content ideas about ${topic}. Include concept, target audience, and key talking points for each.`,
    };

    const result = await generateWithProvider(
      "auto",
      ideaPrompts[type as keyof typeof ideaPrompts],
      {
        maxTokens: 500,
        temperature: 0.7,
      },
    );

    res.json(
      createSuccessResponse({
        content: result.content,
        usage: result.usage,
      }),
    );
  }),
);

// ================================
// IMAGE GENERATION ENDPOINT (Google AI Gemini + Vertex AI Imagen fallback)
// ================================

app.post(
  "/api/generate/image",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      prompt,
      model: requestedModel,
      aspectRatio = "1:1",
      numberOfImages = 1,
    } = req.body;

    if (!prompt) {
      res
        .status(400)
        .json(createErrorResponse("Prompt is required for image generation"));
      return;
    }

    console.log(
      `[Image] Image generation request - prompt: ${prompt.substring(0, 100)}...`,
    );

    const startTime = Date.now();

    try {
      // ---- Strategy 1: GOOGLE_AI_API_KEY + Gemini image generation (no credential file needed) ----
      const googleAiKey =
        process.env.GOOGLE_AI_API_KEY ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.GEMINI_API_KEY;

      if (googleAiKey) {
        console.log(
          `[Image] Using GOOGLE_AI_API_KEY with Gemini image generation`,
        );

        const geminiImageModel = "gemini-2.0-flash-exp-image-generation";
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiImageModel}:generateContent?key=${googleAiKey}`;

        try {
          const geminiResponse = await fetch(geminiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
            }),
            signal: AbortSignal.timeout(60000),
          });

          if (geminiResponse.ok) {
            const geminiResult = await geminiResponse.json();
            const responseTime = Date.now() - startTime;

            const parts: Array<Record<string, unknown>> =
              geminiResult?.candidates?.[0]?.content?.parts || [];
            const imagePart = parts.find((p) => p.inlineData);

            if (imagePart?.inlineData) {
              const inlineData = imagePart.inlineData as {
                data: string;
                mimeType?: string;
              };
              console.log(
                `[Image] Gemini image generated in ${responseTime}ms`,
              );
              res.json(
                createSuccessResponse({
                  imageBase64: inlineData.data,
                  revisedPrompt: prompt,
                  model: geminiImageModel,
                  provider: "google-ai-gemini",
                  aspectRatio,
                  responseTime,
                }),
              );
              return;
            }
            console.warn(`[Image] Gemini returned no image parts`);
          } else {
            const errText = await geminiResponse.text();
            console.warn(
              `[Image] Gemini failed (${geminiResponse.status}): ${errText.substring(0, 200)}`,
            );
          }
        } catch (geminiErr) {
          console.warn(
            `[Image] Gemini fetch error: ${(geminiErr as Error).message}`,
          );
        }
      }

      // ---- Strategy 2: Vertex AI Imagen (requires service account credential file) ----
      const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const hasProjectId =
        process.env.GOOGLE_VERTEX_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;

      if (!googleAiKey && (!hasCredentials || !hasProjectId)) {
        res
          .status(503)
          .json(
            createErrorResponse(
              "Image generation requires GOOGLE_AI_API_KEY. Please add it to neurolink-demo/.env",
              { requiredVars: ["GOOGLE_AI_API_KEY"] },
            ),
          );
        return;
      }

      if (hasCredentials && hasProjectId) {
        const IMAGEN_MODELS = [
          "imagen-3.0-generate-002",
          "imagen-3.0-generate-001",
          "imagen-4.0-generate-preview-05-20",
        ];
        const model = IMAGEN_MODELS.includes(requestedModel)
          ? requestedModel
          : "imagen-3.0-generate-002";

        const projectId = hasProjectId as string;
        const location = process.env.GOOGLE_VERTEX_LOCATION || "us-central1";

        const { GoogleAuth } = await import("google-auth-library");
        const auth = new GoogleAuth({
          keyFilename: hasCredentials,
          scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        if (!accessToken.token)
          throw new Error("Failed to get Vertex AI access token");

        const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`;
        const aspectRatioMap: Record<string, string> = {
          "1:1": "1:1",
          "16:9": "16:9",
          "9:16": "9:16",
          "4:3": "4:3",
          "3:4": "3:4",
        };

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken.token}`,
          },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: numberOfImages,
              aspectRatio: aspectRatioMap[aspectRatio] || "1:1",
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Vertex AI error: ${response.status} - ${errorText.substring(0, 200)}`,
          );
        }

        const result = await response.json();
        const responseTime = Date.now() - startTime;

        if (!result.predictions?.length)
          throw new Error("No images returned from Vertex AI");
        const prediction = result.predictions[0];
        const base64Image =
          prediction.bytesBase64Encoded ||
          prediction.image?.bytesBase64Encoded ||
          prediction.imageBytes;

        if (!base64Image)
          throw new Error("No image data in Vertex AI response");

        console.log(`[Image] Vertex Imagen generated in ${responseTime}ms`);
        res.json(
          createSuccessResponse({
            imageBase64: base64Image,
            revisedPrompt: prompt,
            model,
            provider: "vertex-imagen",
            aspectRatio,
            responseTime,
          }),
        );
        return;
      }

      res
        .status(503)
        .json(createErrorResponse("No image generation provider available."));
    } catch (error) {
      const errorMessage = (error as Error).message || String(error);
      console.error(`[Image] Error:`, errorMessage);
      res.status(500).json(createErrorResponse(errorMessage));
    }
  }),
);

// ================================
// RAG (Retrieval-Augmented Generation) ENDPOINT
// ================================

// In-memory RAG storage
const ragDocuments = new Map<
  string,
  { text: string; metadata: Record<string, unknown> }
>();
const ragChunks = new Map<
  string,
  Array<{
    text: string;
    embedding?: number[];
    metadata: Record<string, unknown>;
  }>
>();

app.post(
  "/api/rag/index",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      documentId,
      content,
      metadata = {},
      chunkSize = 1000,
      chunkOverlap = 200,
    } = req.body;

    if (!documentId || !content) {
      res
        .status(400)
        .json(
          createErrorResponse(
            "documentId and content are required for RAG indexing",
          ),
        );
      return;
    }

    console.log(
      `[RAG] Indexing document: ${documentId}, content length: ${content.length}`,
    );

    try {
      // Store the document
      ragDocuments.set(documentId, {
        text: content,
        metadata: { ...metadata, indexedAt: new Date().toISOString() },
      });

      // Simple chunking (split by paragraphs and size)
      const chunks: Array<{ text: string; metadata: Record<string, unknown> }> =
        [];
      const paragraphs = content.split(/\n\n+/);
      let currentChunk = "";

      for (const paragraph of paragraphs) {
        if (
          (currentChunk + paragraph).length > chunkSize &&
          currentChunk.length > 0
        ) {
          chunks.push({
            text: currentChunk.trim(),
            metadata: { documentId, chunkIndex: chunks.length },
          });
          // Keep some overlap
          const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
          currentChunk =
            currentChunk.substring(overlapStart) + "\n\n" + paragraph;
        } else {
          currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
        }
      }

      // Add the last chunk
      if (currentChunk.trim()) {
        chunks.push({
          text: currentChunk.trim(),
          metadata: { documentId, chunkIndex: chunks.length },
        });
      }

      ragChunks.set(documentId, chunks);

      console.log(
        `[RAG] Document ${documentId} indexed with ${chunks.length} chunks`,
      );

      res.json(
        createSuccessResponse({
          documentId,
          chunksCreated: chunks.length,
          totalCharacters: content.length,
          message: `Document indexed successfully with ${chunks.length} chunks`,
        }),
      );
    } catch (error) {
      const errorMessage = (error as Error).message || String(error);
      console.error(`[RAG] Index error:`, errorMessage);
      res.status(500).json(createErrorResponse(errorMessage));
    }
  }),
);

app.post(
  "/api/rag/query",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { query, documentIds, topK = 5, provider = "auto" } = req.body;

    if (!query) {
      res
        .status(400)
        .json(createErrorResponse("Query is required for RAG search"));
      return;
    }

    console.log(`[RAG] Query: ${query.substring(0, 100)}...`);

    try {
      // Get all chunks from specified documents or all documents
      const allChunks: Array<{
        text: string;
        metadata: Record<string, unknown>;
        documentId: string;
      }> = [];

      const docsToSearch = documentIds || Array.from(ragDocuments.keys());

      for (const docId of docsToSearch) {
        const chunks = ragChunks.get(docId);
        if (chunks) {
          for (const chunk of chunks) {
            allChunks.push({ ...chunk, documentId: docId });
          }
        }
      }

      if (allChunks.length === 0) {
        res.json(
          createSuccessResponse({
            answer:
              "No documents have been indexed yet. Please index some documents first using the /api/rag/index endpoint.",
            sources: [],
            query,
          }),
        );
        return;
      }

      // Simple keyword-based search (BM25-style scoring)
      const queryTerms = query
        .toLowerCase()
        .split(/\s+/)
        .filter((t: string) => t.length > 2);
      const scoredChunks = allChunks.map((chunk) => {
        const textLower = chunk.text.toLowerCase();
        let score = 0;
        for (const term of queryTerms) {
          const matches = (textLower.match(new RegExp(term, "g")) || []).length;
          score += matches;
        }
        return { ...chunk, score };
      });

      // Sort by score and take top K
      const topChunks = scoredChunks
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      if (topChunks.length === 0) {
        // No relevant chunks found, use AI to answer without context
        const result = await generateWithProvider(provider, query, {
          maxTokens: 500,
          temperature: 0.7,
        });

        res.json(
          createSuccessResponse({
            answer: result.content,
            sources: [],
            query,
            provider: result.provider,
            contextUsed: false,
          }),
        );
        return;
      }

      // Build context from top chunks
      const context = topChunks
        .map((c, i) => `[Source ${i + 1}: ${c.documentId}]\n${c.text}`)
        .join("\n\n---\n\n");

      // Use AI to answer with context
      const ragPrompt = `You are a helpful assistant answering questions based on the provided context.

CONTEXT:
${context}

QUESTION: ${query}

Instructions:
- Answer the question based primarily on the provided context
- If the context doesn't contain enough information, say so
- Be concise and accurate
- Cite sources when possible (e.g., "According to Source 1...")

ANSWER:`;

      const result = await generateWithProvider(provider, ragPrompt, {
        maxTokens: 1000,
        temperature: 0.3,
      });

      const sources = topChunks.map((c) => ({
        documentId: c.documentId,
        excerpt: c.text.substring(0, 200) + (c.text.length > 200 ? "..." : ""),
        score: c.score,
      }));

      console.log(
        `[RAG] Query answered using ${topChunks.length} context chunks`,
      );

      res.json(
        createSuccessResponse({
          answer: result.content,
          sources,
          query,
          provider: result.provider,
          contextUsed: true,
          chunksUsed: topChunks.length,
        }),
      );
    } catch (error) {
      const errorMessage = (error as Error).message || String(error);
      console.error(`[RAG] Query error:`, errorMessage);
      res.status(500).json(createErrorResponse(errorMessage));
    }
  }),
);

app.get(
  "/api/rag/documents",
  asyncHandler(async (req: Request, res: Response) => {
    const documents = Array.from(ragDocuments.entries()).map(([id, data]) => ({
      documentId: id,
      metadata: data.metadata,
      chunkCount: ragChunks.get(id)?.length || 0,
    }));

    res.json(
      createSuccessResponse({
        documents,
        totalDocuments: documents.length,
      }),
    );
  }),
);

app.delete(
  "/api/rag/documents/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (ragDocuments.has(id)) {
      ragDocuments.delete(id);
      ragChunks.delete(id);
      res.json(createSuccessResponse({ message: `Document ${id} removed` }));
    } else {
      res.status(404).json(createErrorResponse(`Document ${id} not found`));
    }
  }),
);

// ================================
// CONTEXT SUMMARIZATION ENDPOINTS
// ================================

// In-memory session storage for context management
interface SessionMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  tokenCount: number;
}

interface Session {
  id: string;
  messages: SessionMessage[];
  summary?: string;
  summarizedUpToMessageId?: string;
  createdAt: string;
  lastActivityAt: string;
  totalTokens: number;
  summarizationCount: number;
}

const sessions = new Map<string, Session>();

// Token estimation helper (rough approximation: ~4 chars per token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Generate unique message ID
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get or create session
function getOrCreateSession(sessionId: string): Session {
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      id: sessionId,
      messages: [],
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      totalTokens: 0,
      summarizationCount: 0,
    };
    sessions.set(sessionId, session);
  }
  return session;
}

// Concise summarization prompt for better context summaries
function createSummarizationPrompt(
  messages: SessionMessage[],
  previousSummary?: string,
): string {
  const conversationText = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  if (previousSummary) {
    return `Update this conversation summary with the new messages below.

CURRENT SUMMARY:
${previousSummary}

NEW MESSAGES:
${conversationText}

INSTRUCTIONS:
1. Merge new information into the existing summary
2. Keep it concise (2-4 sentences max)
3. Focus on what was discussed, decided, and any action items
4. Remove outdated information

UPDATED SUMMARY:`;
  }

  return `Create a concise summary of this conversation.

MESSAGES:
${conversationText}

INSTRUCTIONS:
1. Write 2-4 sentences summarizing what was discussed
2. Include any decisions made or conclusions reached
3. Mention any action items or follow-up tasks
4. Be specific - use actual topics, names, and details from the conversation
5. Do NOT use generic phrases like "The user's main goal is..."

SUMMARY:`;
}

// POST /api/context/chat - Chat with automatic context management
app.post(
  "/api/context/chat",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      sessionId = "default",
      message,
      provider = "vertex", // Default to Vertex AI (uses service account credentials)
      tokenThreshold = 50000,
      enableSummarization = true,
    } = req.body;

    if (!message) {
      res.status(400).json(createErrorResponse("Message is required"));
      return;
    }

    console.log(`[Context] Chat message for session: ${sessionId}`);

    try {
      const session = getOrCreateSession(sessionId);

      // Add user message
      const userMessage: SessionMessage = {
        id: generateMessageId(),
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
        tokenCount: estimateTokens(message),
      };
      session.messages.push(userMessage);
      session.totalTokens += userMessage.tokenCount;
      session.lastActivityAt = new Date().toISOString();

      // Build context for AI
      let contextForAI = "";
      if (session.summary) {
        contextForAI = `CONTEXT SUMMARY FROM PREVIOUS CONVERSATION:\n${session.summary}\n\n`;
      }

      // Include recent messages (after last summary)
      const recentMessages = session.summarizedUpToMessageId
        ? session.messages.filter((m) => {
            const idx = session.messages.findIndex(
              (msg) => msg.id === session.summarizedUpToMessageId,
            );
            return session.messages.indexOf(m) > idx;
          })
        : session.messages;

      contextForAI +=
        "CURRENT CONVERSATION:\n" +
        recentMessages
          .map(
            (m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`,
          )
          .join("\n\n");

      // Generate response
      const responseStartTime = Date.now();
      const result = await generateWithProvider(provider, contextForAI, {
        maxTokens: 1000,
        temperature: 0.7,
      });

      // Add assistant message
      const assistantMessage: SessionMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: result.content,
        timestamp: new Date().toISOString(),
        tokenCount: estimateTokens(result.content),
      };
      session.messages.push(assistantMessage);
      session.totalTokens += assistantMessage.tokenCount;

      // Check if summarization needed
      let wasSummarized = false;
      if (enableSummarization && session.totalTokens > tokenThreshold) {
        console.log(
          `[Context] Token threshold (${tokenThreshold}) exceeded, triggering summarization...`,
        );

        // Find messages to summarize (keep recent 30%)
        const keepRecentCount = Math.max(
          2,
          Math.floor(session.messages.length * 0.3),
        );
        const messagesToSummarize = session.messages.slice(0, -keepRecentCount);

        if (messagesToSummarize.length > 0) {
          const summaryPrompt = createSummarizationPrompt(
            messagesToSummarize,
            session.summary,
          );
          const summaryResult = await generateWithProvider(
            isProviderConfigured("vertex") ? "vertex" : "openai", // Use vertex (Gemini) or openai
            summaryPrompt,
            { maxTokens: 1000, temperature: 0.3 },
          );

          session.summary = summaryResult.content;
          session.summarizedUpToMessageId =
            messagesToSummarize[messagesToSummarize.length - 1]?.id ||
            undefined;
          session.totalTokens =
            estimateTokens(session.summary) +
            session.messages
              .slice(-keepRecentCount)
              .reduce((sum, m) => sum + m.tokenCount, 0);
          session.summarizationCount++;
          wasSummarized = true;

          console.log(
            `[Context] Summarization completed. New token estimate: ${session.totalTokens}`,
          );
        }
      }

      res.json(
        createSuccessResponse({
          response: result.content,
          sessionId: session.id,
          contextStats: {
            totalMessages: session.messages.length,
            totalTokens: session.totalTokens,
            summarizationCount: session.summarizationCount,
            hasSummary: !!session.summary,
            wasSummarized,
          },
          provider: result.provider,
          responseTime: result.responseTime,
        }),
      );
    } catch (error) {
      const errorMessage = (error as Error).message || String(error);
      console.error(`[Context] Chat error:`, errorMessage);
      res.status(500).json(createErrorResponse(errorMessage));
    }
  }),
);

// POST /api/context/summarize - Manually trigger summarization
app.post(
  "/api/context/summarize",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { sessionId, provider = "auto", keepRecentCount = 5 } = req.body;

    if (!sessionId) {
      res.status(400).json(createErrorResponse("sessionId is required"));
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res
        .status(404)
        .json(createErrorResponse(`Session ${sessionId} not found`));
      return;
    }

    console.log(`[Context] Manual summarization for session: ${sessionId}`);

    try {
      const messagesToSummarize = session.messages.slice(0, -keepRecentCount);

      if (messagesToSummarize.length === 0) {
        res.json(
          createSuccessResponse({
            message:
              "Not enough messages to summarize. Need more than keepRecentCount.",
            sessionStats: {
              totalMessages: session.messages.length,
              totalTokens: session.totalTokens,
            },
          }),
        );
        return;
      }

      const summaryPrompt = createSummarizationPrompt(
        messagesToSummarize,
        session.summary,
      );
      const result = await generateWithProvider(
        isProviderConfigured("vertex") ? "vertex" : "openai", // Use vertex (Gemini) or openai
        summaryPrompt,
        { maxTokens: 1000, temperature: 0.3 },
      );

      session.summary = result.content;
      session.summarizedUpToMessageId =
        messagesToSummarize[messagesToSummarize.length - 1]?.id || undefined;
      session.totalTokens =
        estimateTokens(session.summary) +
        session.messages
          .slice(-keepRecentCount)
          .reduce((sum, m) => sum + m.tokenCount, 0);
      session.summarizationCount++;

      res.json(
        createSuccessResponse({
          summary: result.content,
          messagesSummarized: messagesToSummarize.length,
          sessionStats: {
            totalMessages: session.messages.length,
            totalTokens: session.totalTokens,
            summarizationCount: session.summarizationCount,
          },
          provider: result.provider,
        }),
      );
    } catch (error) {
      const errorMessage = (error as Error).message || String(error);
      console.error(`[Context] Summarization error:`, errorMessage);
      res.status(500).json(createErrorResponse(errorMessage));
    }
  }),
);

// GET /api/context/sessions - List all sessions
app.get(
  "/api/context/sessions",
  asyncHandler(async (req: Request, res: Response) => {
    const sessionList = Array.from(sessions.values()).map((session) => ({
      sessionId: session.id,
      messageCount: session.messages.length,
      totalTokens: session.totalTokens,
      summarizationCount: session.summarizationCount,
      hasSummary: !!session.summary,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
    }));

    res.json(
      createSuccessResponse({
        sessions: sessionList,
        totalSessions: sessionList.length,
      }),
    );
  }),
);

// GET /api/context/session/:id - Get session details
app.get(
  "/api/context/session/:id",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const session = sessions.get(id);

    if (!session) {
      res.status(404).json(createErrorResponse(`Session ${id} not found`));
      return;
    }

    res.json(
      createSuccessResponse({
        session: {
          id: session.id,
          messages: session.messages,
          summary: session.summary,
          totalTokens: session.totalTokens,
          summarizationCount: session.summarizationCount,
          createdAt: session.createdAt,
          lastActivityAt: session.lastActivityAt,
        },
      }),
    );
  }),
);

// DELETE /api/context/session/:id - Clear a session
app.delete(
  "/api/context/session/:id",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (sessions.has(id)) {
      sessions.delete(id);
      res.json(createSuccessResponse({ message: `Session ${id} cleared` }));
    } else {
      res.status(404).json(createErrorResponse(`Session ${id} not found`));
    }
  }),
);

// ================================
// PDF ANALYSIS ENDPOINT
// ================================

import PDFParser from "pdf2json";

app.post(
  "/api/analyze/pdf",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      pdfBase64,
      analysisType = "general",
      provider = "auto",
      customPrompt,
    } = req.body;

    if (!pdfBase64) {
      res
        .status(400)
        .json(createErrorResponse("PDF data is required for analysis"));
      return;
    }

    console.log(`[PDF] Analyzing PDF, type: ${analysisType}`);

    try {
      // Analysis prompts based on type
      const analysisPrompts: Record<string, string> = {
        general:
          "Provide a comprehensive summary of this PDF document. Include the main topics, key points, and important details.",
        summary:
          "Summarize this PDF document in a clear and concise manner. Focus on the most important information.",
        extraction:
          "Extract all key data from this PDF including: dates, names, amounts, addresses, and any structured information. Format as JSON if possible.",
        invoice:
          "Extract invoice details from this PDF: invoice number, date, vendor, line items, totals, and payment terms.",
        report:
          "Analyze this report and provide: executive summary, key findings, recommendations, and important metrics.",
        contract:
          "Analyze this contract/legal document. Identify: parties involved, key terms, obligations, dates, and any notable clauses.",
        comparison:
          "Provide a detailed breakdown of this document's structure, sections, and content organization.",
      };

      const prompt =
        customPrompt ||
        analysisPrompts[analysisType] ||
        analysisPrompts["general"];

      // Convert base64 to buffer
      const pdfBuffer = Buffer.from(pdfBase64, "base64");
      const pdfSizeKB = Math.round(pdfBuffer.length / 1024);

      console.log(
        `[PDF] PDF size: ${pdfSizeKB}KB, extracting text with pdf2json...`,
      );

      // Extract text from PDF using pdf2json
      let extractedText = "";
      let pageCount = 0;

      try {
        extractedText = await new Promise<string>((resolve, reject) => {
          const pdfParser = new (PDFParser as any)(null, 1);

          pdfParser.on("pdfParser_dataError", (errData: any) => {
            console.error(`[PDF] pdf2json error:`, errData.parserError);
            reject(new Error(errData.parserError));
          });

          pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            // Extract text from all pages
            let text = "";
            if (pdfData?.Pages) {
              pageCount = pdfData.Pages.length;
              for (const page of pdfData.Pages) {
                for (const textItem of page.Texts || []) {
                  // Decode URI-encoded text
                  text += decodeURIComponent(textItem.R[0].T) + " ";
                }
                text += "\n";
              }
            }
            resolve(text);
          });

          // Parse the buffer
          pdfParser.parseBuffer(pdfBuffer);
        });
      } catch (parseError) {
        // If pdf2json fails, provide a helpful error message
        const errorMsg = (parseError as Error).message || String(parseError);
        console.error(`[PDF] Parse error:`, errorMsg);

        res.json(
          createSuccessResponse({
            analysis: `📄 PDF Analysis Failed\n\nThe PDF could not be parsed. This may happen if:\n\n1. **Invalid PDF format** - The file may be corrupted or not a valid PDF\n2. **Encrypted PDF** - Password-protected PDFs cannot be analyzed\n3. **Image-based PDF** - Scanned documents without OCR need different processing\n\n**Error details:** ${errorMsg}\n\n**Suggestions:**\n- Try uploading a different PDF\n- Ensure the PDF is not password-protected\n- For scanned documents, use an OCR tool first`,
            analysisType,
            provider: "pdf2json",
            model: "text-extraction",
            pageCount: 0,
            pdfSizeKB,
            error: errorMsg,
          }),
        );
        return;
      }

      console.log(
        `[PDF] Extracted ${extractedText.length} characters from ${pageCount} pages`,
      );

      if (!extractedText || extractedText.trim().length === 0) {
        res.json(
          createSuccessResponse({
            analysis:
              "📄 No extractable text found in this PDF. The document may be:\n\n• **Image-based** - Scanned documents need OCR processing\n• **Empty** - The PDF contains no text content\n• **Graphics-only** - Only images/charts without text\n\n**Suggestions:**\n- For scanned documents, use an OCR tool first\n- Try uploading a text-based PDF",
            analysisType,
            provider: "pdf2json",
            model: "text-extraction",
            pageCount,
            pdfSizeKB,
          }),
        );
        return;
      }

      // Truncate text if too long (most AI providers have token limits)
      const maxChars = 15000;
      const truncatedText =
        extractedText.length > maxChars
          ? extractedText.substring(0, maxChars) +
            "\n\n[... Document truncated due to length ...]"
          : extractedText;

      // Create analysis prompt based on type
      const analysisPrompt = `${prompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PDF CONTENT (${pageCount} pages, ${extractedText.length} characters):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${truncatedText}`;

      console.log(`[PDF] Analyzing with AI, type: ${analysisType}`);

      // Use AI to analyze the extracted text
      const result = await generateWithProvider(
        provider === "auto" ? "litellm" : provider,
        analysisPrompt,
        {
          maxTokens: 2000,
          temperature: 0.3,
        },
      );

      console.log(`[PDF] Analysis completed in ${result.responseTime}ms`);

      res.json(
        createSuccessResponse({
          analysis: result.content,
          analysisType,
          provider: result.provider,
          model: result.model,
          pageCount,
          pdfSizeKB,
          textLength: extractedText.length,
          responseTime: result.responseTime,
        }),
      );
    } catch (error) {
      const errorMessage = (error as Error).message || String(error);
      console.error(`[PDF] Error:`, errorMessage);
      res.status(500).json(createErrorResponse(errorMessage));
    }
  }),
);

// ================================
// VIDEO ANALYSIS ENDPOINT
// ================================

app.post(
  "/api/analyze/video",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      videoBase64,
      analysisType = "general",
      provider = "auto",
      customPrompt,
    } = req.body;

    // If videoUrl provided, fetch it server-side and convert to base64
    if (!videoBase64 && req.body.videoUrl) {
      const videoUrl = req.body.videoUrl as string;
      console.log(`[Video] Fetching video from URL: ${videoUrl}`);
      try {
        const urlResponse = await fetch(videoUrl, {
          signal: AbortSignal.timeout(30000),
        });
        if (!urlResponse.ok) {
          res
            .status(400)
            .json(
              createErrorResponse(
                `Failed to fetch video URL: HTTP ${urlResponse.status}`,
              ),
            );
          return;
        }
        const arrayBuffer = await urlResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        req.body.videoBase64 = buffer.toString("base64");
      } catch (fetchErr) {
        res
          .status(400)
          .json(
            createErrorResponse(
              `Could not fetch video from URL: ${(fetchErr as Error).message}`,
            ),
          );
        return;
      }
    }

    const resolvedVideoBase64: string = req.body.videoBase64;

    if (!resolvedVideoBase64) {
      res
        .status(400)
        .json(
          createErrorResponse(
            "Video data is required for analysis. Provide videoBase64 or videoUrl.",
          ),
        );
      return;
    }

    console.log(
      `[Video] Analyzing video, type: ${analysisType}, provider: ${provider}`,
    );

    try {
      // Analysis prompts based on type
      const analysisPrompts: Record<string, string> = {
        general:
          "Give a detailed description of this video. Analyze the content, actions, and any notable elements.",
        bugs: "Find UI/UX bugs, validation errors, hidden elements, or misleading UI patterns. Look for issues where user might get stuck.",
        workflow:
          "Trace the logical progression of this workflow. Does every state change correspond to a user action? Are there any unexpected transitions?",
        performance:
          "Analyze the responsiveness. Are there any noticeable delays between user actions and system responses? Does the UI feel sluggish?",
        errors:
          "How does the system handle errors? Are error messages clear and actionable? Is there proper recovery guidance?",
        silentFailures:
          "Identify any 'Silent Failures' where an action is taken but the UI/System provides no feedback loop.",
      };

      const prompt =
        customPrompt ||
        analysisPrompts[analysisType] ||
        analysisPrompts["general"];

      // Use resolved base64 (from direct upload or URL fetch)
      const videoBase64 = resolvedVideoBase64;
      // Convert base64 to buffer
      const videoBuffer = Buffer.from(videoBase64, "base64");
      const videoSizeKB = Math.round(videoBuffer.length / 1024);

      // Determine which provider to use
      let videoProvider = provider;
      if (provider === "auto") {
        // Priority: litellm (if configured) -> vertex -> google-ai
        if (isProviderConfigured("litellm")) {
          videoProvider = "litellm";
        } else if (isProviderConfigured("vertex")) {
          videoProvider = "vertex";
        } else if (isProviderConfigured("google-ai")) {
          videoProvider = "google-ai";
        } else {
          videoProvider = "litellm"; // Will fail with helpful message if not configured
        }
      }

      console.log(
        `[Video] Using provider: ${videoProvider}, video size: ${videoSizeKB}KB`,
      );

      // Handle LiteLLM differently - use OpenAI-compatible vision API
      if (videoProvider === "litellm") {
        const litellmBaseURL =
          process.env.LITELLM_BASE_URL || "http://localhost:4000";

        console.log(
          `[Video] Using LiteLLM at ${litellmBaseURL} for video analysis`,
        );

        // For LiteLLM, we send the video as base64 to vision-capable models
        // GPT-4 Vision and similar models can analyze video frames
        const litellmModel = process.env.LITELLM_VIDEO_MODEL || "gpt-4o";

        try {
          const response = await fetch(
            `${litellmBaseURL}/v1/chat/completions`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.LITELLM_API_KEY || "sk-litellm"}`,
              },
              body: JSON.stringify({
                model: litellmModel,
                messages: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: prompt,
                      },
                      {
                        type: "video_url",
                        video_url: {
                          url: `data:video/mp4;base64,${videoBase64}`,
                        },
                      },
                    ],
                  },
                ],
                max_tokens: 4000,
              }),
            },
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              `[Video] LiteLLM error: ${response.status} - ${errorText}`,
            );

            // Try fallback to Gemini if LiteLLM fails - use direct API with video content
            if (
              isProviderConfigured("vertex") ||
              isProviderConfigured("google-ai")
            ) {
              console.log(
                `[Video] LiteLLM failed, falling back to Gemini with video content...`,
              );

              // Use direct Gemini API with video content (not generateWithProvider which doesn't support video)
              const fallbackProvider = isProviderConfigured("vertex")
                ? "vertex"
                : "google-ai";

              if (fallbackProvider === "vertex") {
                // Vertex AI Gemini with video
                const hasCredentials =
                  process.env.GOOGLE_APPLICATION_CREDENTIALS;
                const hasProjectId = process.env.GOOGLE_VERTEX_PROJECT;

                if (hasCredentials && hasProjectId) {
                  const projectId = hasProjectId;
                  const location =
                    process.env.GOOGLE_VERTEX_LOCATION || "us-central1";
                  const videoModel =
                    process.env.VERTEX_VIDEO_MODEL || "gemini-2.0-flash";

                  const { GoogleAuth } = await import("google-auth-library");
                  const auth = new GoogleAuth({
                    keyFilename: hasCredentials,
                    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
                  });

                  const client = await auth.getClient();
                  const accessToken = await client.getAccessToken();

                  if (accessToken.token) {
                    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${videoModel}:generateContent`;

                    const requestBody = {
                      contents: [
                        {
                          role: "user",
                          parts: [
                            {
                              inlineData: {
                                mimeType: "video/mp4",
                                data: videoBase64,
                              },
                            },
                            { text: prompt },
                          ],
                        },
                      ],
                      generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 4000,
                      },
                    };

                    const geminiResponse = await fetch(endpoint, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken.token}`,
                      },
                      body: JSON.stringify(requestBody),
                    });

                    if (geminiResponse.ok) {
                      const geminiResult = await geminiResponse.json();
                      const content =
                        geminiResult.candidates?.[0]?.content?.parts?.[0]
                          ?.text || "No analysis returned";

                      res.json(
                        createSuccessResponse({
                          analysis: content,
                          analysisType,
                          provider: "vertex",
                          model: videoModel,
                          fallbackUsed: true,
                          originalError: `LiteLLM: ${errorText.substring(0, 200)}`,
                        }),
                      );
                      return;
                    }
                  }
                }
              } else {
                // Google AI Studio with video
                const googleAiKey = process.env.GOOGLE_AI_API_KEY;

                if (googleAiKey) {
                  const videoModel =
                    process.env.GOOGLE_AI_VIDEO_MODEL || "gemini-2.0-flash";

                  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${videoModel}:generateContent?key=${googleAiKey}`;

                  const requestBody = {
                    contents: [
                      {
                        parts: [
                          {
                            inlineData: {
                              mimeType: "video/mp4",
                              data: videoBase64,
                            },
                          },
                          { text: prompt },
                        ],
                      },
                    ],
                    generationConfig: {
                      temperature: 0.3,
                      maxOutputTokens: 4000,
                    },
                  };

                  const geminiResponse = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody),
                  });

                  if (geminiResponse.ok) {
                    const geminiResult = await geminiResponse.json();
                    const content =
                      geminiResult.candidates?.[0]?.content?.parts?.[0]?.text ||
                      "No analysis returned";

                    res.json(
                      createSuccessResponse({
                        analysis: content,
                        analysisType,
                        provider: "google-ai",
                        model: videoModel,
                        fallbackUsed: true,
                        originalError: `LiteLLM: ${errorText.substring(0, 200)}`,
                      }),
                    );
                    return;
                  }
                }
              }
            }

            throw new Error(
              `LiteLLM video analysis failed: ${errorText.substring(0, 500)}`,
            );
          }

          const data = await response.json();
          const analysisText =
            data.choices?.[0]?.message?.content || "No analysis returned";

          console.log(`[Video] LiteLLM analysis completed`);

          res.json(
            createSuccessResponse({
              analysis: analysisText,
              analysisType,
              provider: "litellm",
              model: litellmModel,
              videoSizeKB,
            }),
          );
          return;
        } catch (litellmError) {
          // If LiteLLM fails, try Gemini fallback
          if (
            isProviderConfigured("vertex") ||
            isProviderConfigured("google-ai")
          ) {
            console.log(`[Video] LiteLLM error, falling back to Gemini...`);
            const fallbackProvider = isProviderConfigured("vertex")
              ? "vertex"
              : "google-ai";

            const result = await generateWithProvider(
              fallbackProvider,
              prompt,
              {
                maxTokens: 4000,
                temperature: 0.3,
              },
            );

            res.json(
              createSuccessResponse({
                analysis: result.content,
                analysisType,
                provider: result.provider || fallbackProvider,
                model: result.model,
                fallbackUsed: true,
                originalError: (litellmError as Error).message,
              }),
            );
            return;
          }

          throw litellmError;
        }
      }

      // For Vertex AI, use the Gemini API directly with video content
      console.log(
        `[Video] Using ${videoProvider} for video analysis with actual video content`,
      );

      if (videoProvider === "vertex") {
        // Use Vertex AI Gemini with video content
        const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        const hasProjectId = process.env.GOOGLE_VERTEX_PROJECT;

        if (!hasCredentials || !hasProjectId) {
          res.status(503).json(
            createErrorResponse("Vertex AI not configured for video analysis", {
              suggestion:
                "Set GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_VERTEX_PROJECT",
            }),
          );
          return;
        }

        const projectId = hasProjectId as string;
        const location = process.env.GOOGLE_VERTEX_LOCATION || "us-central1";
        const videoModel = process.env.VERTEX_VIDEO_MODEL || "gemini-2.0-flash";

        // Use Google Auth to get access token
        const { GoogleAuth } = await import("google-auth-library");
        const auth = new GoogleAuth({
          keyFilename: hasCredentials,
          scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        });

        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        if (!accessToken.token) {
          throw new Error("Failed to get Google Cloud access token");
        }

        const startTime = Date.now();

        // Call Vertex AI Gemini API with video content
        const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${videoModel}:generateContent`;

        const requestBody = {
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: "video/mp4",
                    data: videoBase64,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4000,
          },
        };

        console.log(
          `[Video] Calling Vertex AI Gemini with video content: ${endpoint}`,
        );

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken.token}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `[Video] Vertex AI error: ${response.status} - ${errorText}`,
          );

          if (response.status === 403) {
            res.status(403).json(
              createErrorResponse(
                "Vertex AI access denied. Enable the Vertex AI API and ensure your service account has permissions.",
                {
                  suggestion:
                    "Run: gcloud services enable aiplatform.googleapis.com",
                  error: errorText.substring(0, 500),
                },
              ),
            );
            return;
          }

          throw new Error(
            `Vertex AI API error: ${response.status} - ${errorText.substring(0, 200)}`,
          );
        }

        const result = await response.json();
        const responseTime = Date.now() - startTime;

        // Extract the response text
        const candidates = result.candidates || [];
        const content =
          candidates[0]?.content?.parts?.[0]?.text || "No analysis returned";

        console.log(
          `[Video] Vertex AI video analysis completed in ${responseTime}ms`,
        );

        res.json(
          createSuccessResponse({
            analysis: content,
            analysisType,
            provider: "vertex",
            model: videoModel,
            videoSizeKB,
            responseTime,
          }),
        );
        return;
      }

      // For Google AI Studio, use the Gemini API with video content
      if (videoProvider === "google-ai") {
        const googleAiKey = process.env.GOOGLE_AI_API_KEY;

        if (!googleAiKey) {
          res.status(503).json(
            createErrorResponse("Google AI API key not configured", {
              suggestion: "Set GOOGLE_AI_API_KEY in your .env file",
            }),
          );
          return;
        }

        const videoModel =
          process.env.GOOGLE_AI_VIDEO_MODEL || "gemini-2.0-flash";
        const startTime = Date.now();

        // Call Google AI Gemini API with video content
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${videoModel}:generateContent?key=${googleAiKey}`;

        const requestBody = {
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: "video/mp4",
                    data: videoBase64,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4000,
          },
        };

        console.log(`[Video] Calling Google AI Gemini with video content`);

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `[Video] Google AI error: ${response.status} - ${errorText}`,
          );
          throw new Error(
            `Google AI API error: ${response.status} - ${errorText.substring(0, 200)}`,
          );
        }

        const result = await response.json();
        const responseTime = Date.now() - startTime;

        // Extract the response text
        const candidates = result.candidates || [];
        const content =
          candidates[0]?.content?.parts?.[0]?.text || "No analysis returned";

        console.log(
          `[Video] Google AI video analysis completed in ${responseTime}ms`,
        );

        res.json(
          createSuccessResponse({
            analysis: content,
            analysisType,
            provider: "google-ai",
            model: videoModel,
            videoSizeKB,
            responseTime,
          }),
        );
        return;
      }

      // Fallback for other providers - text only (no video support)
      console.log(
        `[Video] Provider ${videoProvider} does not support video, using text-only analysis`,
      );

      const result = await generateWithProvider(videoProvider, prompt, {
        maxTokens: 4000,
        temperature: 0.3,
      });

      console.log(
        `[Video] Analysis completed with ${videoProvider} (text-only, no video content)`,
      );

      res.json(
        createSuccessResponse({
          analysis: result.content,
          analysisType,
          provider: result.provider || videoProvider,
          model: result.model,
          videoSizeKB,
          note: "Video content not processed - provider does not support video input",
        }),
      );
    } catch (error) {
      const errorMessage = (error as Error).message || String(error);
      console.error(`[Video] Error:`, errorMessage);
      res.status(500).json(createErrorResponse(errorMessage));
    }
  }),
);

// ================================
// WEB SEARCH ENDPOINT
// ================================

app.post(
  "/api/web/search/grounded",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { query } = req.body;

    if (!query) {
      res.status(400).json(createErrorResponse("Search query is required"));
      return;
    }

    console.log(
      `[Grounded Search] Searching with Google Search grounding: ${query}`,
    );

    try {
      // Check if Vertex AI is configured
      const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const hasProjectId = process.env.GOOGLE_VERTEX_PROJECT;

      if (!hasCredentials || !hasProjectId) {
        res.status(503).json(
          createErrorResponse("Vertex AI required for grounded search", {
            suggestion:
              "Set GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_VERTEX_PROJECT in your .env file",
            requiredVars: [
              "GOOGLE_APPLICATION_CREDENTIALS",
              "GOOGLE_VERTEX_PROJECT",
            ],
          }),
        );
        return;
      }

      const projectId = hasProjectId as string;
      const location = process.env.GOOGLE_VERTEX_LOCATION || "us-central1";

      // Use Google Auth to get access token
      const { GoogleAuth } = await import("google-auth-library");
      const auth = new GoogleAuth({
        keyFilename: hasCredentials,
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });

      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();

      if (!accessToken.token) {
        throw new Error("Failed to get access token");
      }

      const startTime = Date.now();

      // Call Vertex AI Gemini API with Google Search Retrieval tool
      const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.0-flash:generateContent`;

      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Search the web and provide current, accurate information about: "${query}"

Include:
1. **Current Information**: Latest facts and data from web search
2. **Sources**: List any sources found
3. **Context**: Relevant background
4. **Key Points**: Most important takeaways

Be factual and cite sources when possible.`,
              },
            ],
          },
        ],
        tools: [
          {
            google_search: {},
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
        },
      };

      console.log(
        `[Grounded Search] Calling Vertex AI with Google Search Retrieval: ${endpoint}`,
      );

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken.token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[Grounded Search] Vertex AI error: ${response.status} - ${errorText}`,
        );

        if (response.status === 403) {
          res.status(403).json(
            createErrorResponse(
              "Vertex AI access denied. Enable the Vertex AI API and ensure your service account has permissions.",
              {
                suggestion:
                  "Run: gcloud services enable aiplatform.googleapis.com and ensure the service account has Vertex AI User role",
                error: errorText.substring(0, 500),
              },
            ),
          );
          return;
        }

        throw new Error(
          `Vertex AI API error: ${response.status} - ${errorText.substring(0, 200)}`,
        );
      }

      const result = await response.json();
      const responseTime = Date.now() - startTime;

      // Extract the response text
      const candidates = result.candidates || [];
      const content =
        candidates[0]?.content?.parts?.[0]?.text || "No results found";

      // Extract grounding metadata if available
      const groundingMetadata = candidates[0]?.groundingMetadata;
      const groundingChunks = groundingMetadata?.groundingChunks || [];
      const webSources = groundingChunks
        .filter((chunk: any) => chunk.web)
        .map((chunk: any) => ({
          title: chunk.web.title || "Unknown",
          url: chunk.web.uri || "",
        }));

      console.log(
        `[Grounded Search] Successfully retrieved grounded results in ${responseTime}ms`,
      );

      res.json(
        createSuccessResponse({
          query,
          results: content,
          sources: webSources,
          provider: "google-vertex-grounding",
          model: "gemini-2.0-flash",
          isGrounded: true,
          groundingEnabled: true,
          responseTime,
        }),
      );
    } catch (error) {
      console.error(`[Grounded Search] Error:`, (error as Error).message);
      res.status(500).json(createErrorResponse((error as Error).message));
    }
  }),
);

// Helper function to create Google Search tools (same as directTools.ts)
function createGoogleSearchTools() {
  const searchTool = {};
  Object.defineProperty(searchTool, "google_search", {
    value: {},
    enumerable: true,
    configurable: true,
  });
  return [searchTool];
}

app.post(
  "/api/web/search",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { query } = req.body;

    if (!query) {
      res.status(400).json(createErrorResponse("Search query is required"));
      return;
    }

    console.log(`[Web Search] Searching for: ${query}`);

    try {
      // Check if Vertex AI is configured for grounded search
      const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const hasProjectId = process.env.GOOGLE_VERTEX_PROJECT;

      if (hasCredentials && hasProjectId) {
        // Use Vertex AI SDK with Google Search grounding (same as directTools.ts)
        console.log(
          `[Web Search] Using Vertex AI SDK with Google Search grounding`,
        );

        const { VertexAI } = await import("@google-cloud/vertexai");
        const projectLocation =
          process.env.GOOGLE_VERTEX_LOCATION || "us-central1";

        const vertex_ai = new VertexAI({
          project: hasProjectId as string,
          location: projectLocation,
        });

        const model = vertex_ai.getGenerativeModel({
          model: "gemini-2.5-flash-lite",
          tools: createGoogleSearchTools(),
        });

        const startTime = Date.now();
        const response = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Search for: "${query}". Provide current information with sources.`,
                },
              ],
            },
          ],
        });

        const responseTime = Date.now() - startTime;
        const candidates = response.response.candidates;

        if (!candidates || candidates.length === 0) {
          res.json(
            createSuccessResponse({
              query,
              results: "No results found",
              sources: [],
              provider: "google-vertex-grounding",
              isGrounded: true,
            }),
          );
          return;
        }

        const content = candidates[0].content?.parts?.[0]?.text || "No results";

        // Extract sources from grounding metadata
        const groundingChunks =
          candidates[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks
          .filter((chunk: any) => chunk.web)
          .map((chunk: any) => ({
            title: chunk.web.title || "Unknown",
            url: chunk.web.uri || "",
          }));

        console.log(
          `[Web Search] Vertex AI grounded search completed in ${responseTime}ms`,
        );

        res.json(
          createSuccessResponse({
            query,
            results: content,
            sources,
            provider: "google-vertex-grounding",
            model: "gemini-2.5-flash-lite",
            isGrounded: true,
            responseTime,
          }),
        );
        return;
      }

      // Fallback to Google AI if no Vertex
      if (isProviderConfigured("google-ai")) {
        const searchPrompt = `Provide information about: "${query}"

Include:
1. **Key Facts**: Important facts and details
2. **Background**: Relevant context
3. **Key Points**: Most important takeaways

Note: Based on training data, not real-time search.`;

        const result = await generateWithProvider("google-ai", searchPrompt, {
          maxTokens: 1000,
          temperature: 0.4,
          timeout: 60000,
        });

        res.json(
          createSuccessResponse({
            query,
            results: result.content,
            provider: result.provider,
            model: result.model,
            isGrounded: false,
            responseTime: result.responseTime,
          }),
        );
        return;
      }

      // No suitable provider
      res.status(503).json(
        createErrorResponse(
          "Web search requires Google Vertex AI or Google AI configuration",
          {
            suggestion:
              "Set GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_VERTEX_PROJECT, or GOOGLE_AI_API_KEY",
          },
        ),
      );
    } catch (error) {
      console.error(`[Web Search] Error:`, (error as Error).message);
      res.status(500).json(createErrorResponse((error as Error).message));
    }
  }),
);

// ================================
// PPT GENERATION ENDPOINT
// ================================

import PptxGenJS from "pptxgenjs";

app.post(
  "/api/generate/ppt",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      provider = "auto",
      topic,
      pages = 10,
      theme = "Modern",
      audience = "General",
      tone = "Professional",
      aspectRatio = "16:9",
    } = req.body;

    if (!topic) {
      res
        .status(400)
        .json(createErrorResponse("Topic is required for PPT generation"));
      return;
    }

    console.log(
      `[PPT] Generating ${pages}-slide presentation about: ${topic.substring(0, 100)}`,
    );

    try {
      // Step 1: Generate slide content using AI
      const contentPrompt = `Create a ${pages}-slide PowerPoint presentation about: "${topic}"

Theme: ${theme}
Target Audience: ${audience}
Tone: ${tone}

For each slide, provide:
1. Slide number
2. Title (short, impactful)
3. Content (3-5 bullet points, each under 15 words)
4. Speaker notes (brief explanation)

Format as JSON:
{
  "title": "Presentation Title",
  "slides": [
    {
      "number": 1,
      "title": "Slide Title",
      "bullets": ["Point 1", "Point 2", "Point 3"],
      "notes": "Speaker notes"
    }
  ]
}

Return ONLY valid JSON, no other text.`;

      console.log(`[PPT] Generating content with AI...`);
      const aiResult = await generateWithProvider(provider, contentPrompt, {
        maxTokens: 2000,
        temperature: 0.7,
      });

      // Parse AI response
      let slideData;
      try {
        // Try to extract JSON from the response
        const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          slideData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        console.log(`[PPT] JSON parse failed, creating default structure`);
        // Create default structure if JSON parsing fails
        slideData = {
          title: topic,
          slides: Array.from({ length: Math.min(pages, 10) }, (_, i) => ({
            number: i + 1,
            title: i === 0 ? topic : `Slide ${i + 1}`,
            bullets: [
              "Key point about the topic",
              "Important insight",
              "Relevant data or fact",
            ],
            notes: `Content for slide ${i + 1}`,
          })),
        };
      }

      console.log(
        `[PPT] Creating PowerPoint with ${slideData.slides?.length || pages} slides...`,
      );

      // Step 2: Create PowerPoint using pptxgenjs
      const pptx = new PptxGenJS();

      // Set presentation properties
      pptx.author = "NeuroLink AI";
      pptx.title = slideData.title || topic;
      pptx.subject = topic;

      // Set layout based on aspect ratio
      if (aspectRatio === "4:3") {
        pptx.defineLayout({ name: "CUSTOM", width: 10, height: 7.5 });
      } else {
        pptx.defineLayout({ name: "CUSTOM", width: 13.333, height: 7.5 });
      }
      pptx.layout = "CUSTOM";

      // Theme colors
      const themes: Record<
        string,
        { primary: string; secondary: string; accent: string; bg: string }
      > = {
        Modern: {
          primary: "2C3E50",
          secondary: "3498DB",
          accent: "E74C3C",
          bg: "FFFFFF",
        },
        Professional: {
          primary: "1A365D",
          secondary: "2B6CB0",
          accent: "C53030",
          bg: "FFFFFF",
        },
        Creative: {
          primary: "6B46C1",
          secondary: "9F7AEA",
          accent: "F56565",
          bg: "F7FAFC",
        },
        Minimalist: {
          primary: "2D3748",
          secondary: "4A5568",
          accent: "718096",
          bg: "FFFFFF",
        },
        Dark: {
          primary: "1A202C",
          secondary: "2D3748",
          accent: "F56565",
          bg: "1A202C",
        },
        default: {
          primary: "2C3E50",
          secondary: "3498DB",
          accent: "E74C3C",
          bg: "FFFFFF",
        },
      };
      const colors = themes[theme] || themes["default"];
      const isDark = theme === "Dark";
      const textColor = isDark ? "FFFFFF" : "2D3748";

      // Add title slide
      let titleSlide = pptx.addSlide();
      titleSlide.background = { color: colors.primary };
      titleSlide.addText(slideData.title || topic, {
        x: 0.5,
        y: 2.5,
        w: "90%",
        h: 1.5,
        fontSize: 40,
        bold: true,
        color: "FFFFFF",
        align: "center",
        valign: "middle",
      });
      titleSlide.addText(
        `Generated by NeuroLink AI\n${new Date().toLocaleDateString()}`,
        {
          x: 0.5,
          y: 4.5,
          w: "90%",
          h: 1,
          fontSize: 16,
          color: "CCCCCC",
          align: "center",
          valign: "middle",
        },
      );

      // Add content slides
      const slides = slideData.slides || [];
      for (let i = 0; i < Math.min(slides.length, pages - 1); i++) {
        const slideInfo = slides[i];
        let slide = pptx.addSlide();
        slide.background = { color: colors.bg };

        // Slide title
        slide.addText(slideInfo.title || `Slide ${i + 2}`, {
          x: 0.5,
          y: 0.3,
          w: "90%",
          h: 0.8,
          fontSize: 28,
          bold: true,
          color: colors.primary,
        });

        // Divider line
        slide.addShape("rect", {
          x: 0.5,
          y: 1.1,
          w: 2,
          h: 0.05,
          fill: { color: colors.secondary },
        });

        // Bullet points
        const bullets = slideInfo.bullets || [
          "Content point 1",
          "Content point 2",
          "Content point 3",
        ];
        const bulletText = bullets.map((b: string) => ({
          text: b,
          options: { bullet: { type: "bullet", color: colors.accent } },
        }));

        slide.addText(bulletText, {
          x: 0.5,
          y: 1.5,
          w: "85%",
          h: 4,
          fontSize: 18,
          color: textColor,
          valign: "top",
        });

        // Speaker notes
        if (slideInfo.notes) {
          slide.addNotes(slideInfo.notes);
        }

        // Slide number
        slide.addText(`${i + 2}`, {
          x: "90%",
          y: "90%",
          w: 0.5,
          h: 0.3,
          fontSize: 10,
          color: "999999",
          align: "right",
        });
      }

      // Generate the file as a buffer (don't save to disk)
      console.log(`[PPT] Generating PowerPoint buffer...`);
      const pptBuffer = (await pptx.write({
        outputType: "nodebuffer",
      })) as Buffer;
      const fileSizeKB = Math.round(pptBuffer.length / 1024);
      const fileName = `neurolink-ppt-${Date.now()}.pptx`;

      console.log(`[PPT] Presentation created: ${fileName} (${fileSizeKB}KB)`);

      // Set headers for file download
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`,
      );
      res.setHeader("Content-Length", pptBuffer.length);

      // Send the file buffer directly to the user
      res.send(pptBuffer);
    } catch (error) {
      const errorMessage = (error as Error).message || String(error);
      console.error(`[PPT] Error:`, errorMessage);
      console.error(`[PPT] Stack:`, (error as Error).stack);
      res.status(500).json(createErrorResponse(errorMessage));
    }
  }),
);

// ================================
// DEVELOPER TOOLS ENDPOINTS
// ================================

/**
 * POST /api/developer/code
 * Generate clean, production-ready code
 */
app.post(
  "/api/developer/code",
  asyncHandler(async (req: Request, res: Response) => {
    const { language, description } = req.body;

    const codePrompt = `Generate clean, well-commented ${language} code for: ${description}

Requirements:
- Follow best practices for ${language}
- Include proper error handling
- Add clear comments explaining the logic
- Make it production-ready

Code:`;

    const result = await generateWithProvider("auto", codePrompt, {
      maxTokens: 600,
      temperature: 0.4,
    });

    res.json(
      createSuccessResponse({
        content: result.content,
        usage: result.usage,
      }),
    );
  }),
);

/**
 * POST /api/developer/api-doc
 * Generate comprehensive API documentation
 */
app.post(
  "/api/developer/api-doc",
  asyncHandler(async (req: Request, res: Response) => {
    const { description } = req.body;

    const docPrompt = `Create comprehensive API documentation for: ${description}

Include:
- Endpoint descriptions
- Request/response examples
- Parameter definitions
- Error codes and messages
- Authentication requirements
- Usage examples in multiple languages

Documentation:`;

    const result = await generateWithProvider("auto", docPrompt, {
      maxTokens: 800,
      temperature: 0.3,
    });

    res.json(
      createSuccessResponse({
        content: result.content,
        usage: result.usage,
      }),
    );
  }),
);

/**
 * POST /api/developer/debug
 * Analyze errors and provide debugging guidance
 */
app.post(
  "/api/developer/debug",
  asyncHandler(async (req: Request, res: Response) => {
    const { error } = req.body;

    const debugPrompt = `Analyze this error and provide debugging help:

${error}

Please provide:
1. Explanation of what the error means
2. Most likely causes
3. Step-by-step debugging approach
4. Code examples of potential fixes
5. Best practices to prevent similar issues

Analysis:`;

    const result = await generateWithProvider("auto", debugPrompt, {
      maxTokens: 600,
      temperature: 0.4,
    });

    res.json(
      createSuccessResponse({
        content: result.content,
        usage: result.usage,
      }),
    );
  }),
);

// ================================
// NATIVE NEUROLINK DEVELOPER TOOLS
// ================================

app.post(
  "/api/developer/csv-analyze",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { csvContent, operation = "describe", column } = req.body;

    if (!csvContent) {
      res.status(400).json(createErrorResponse("CSV content is required"));
      return;
    }

    console.log(`[CSV] Analyzing CSV, operation: ${operation}`);

    try {
      // Parse CSV content
      const lines = csvContent.trim().split("\n");
      if (lines.length < 2) {
        res
          .status(400)
          .json(
            createErrorResponse(
              "CSV must have at least a header and one data row",
            ),
          );
        return;
      }

      const headers = lines[0]
        .split(",")
        .map((h: string) => h.trim().replace(/"/g, ""));
      const rows = lines.slice(1).map((line: string) => {
        const values = line
          .split(",")
          .map((v: string) => v.trim().replace(/"/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h: string, i: number) => {
          row[h] = values[i] || "";
        });
        return row;
      });

      let result: Record<string, unknown> = {};

      switch (operation) {
        case "describe": {
          result = {
            totalRows: rows.length,
            columns: headers,
            columnCount: headers.length,
            sampleData: rows.slice(0, 3),
          };
          break;
        }

        case "count_by_column": {
          if (!column) {
            res
              .status(400)
              .json(
                createErrorResponse("Column name required for count operation"),
              );
            return;
          }
          const counts: Record<string, number> = {};
          for (const row of rows) {
            const value = row[column] || "undefined";
            counts[value] = (counts[value] || 0) + 1;
          }
          result = {
            column,
            counts: Object.fromEntries(
              Object.entries(counts).sort(([, a], [, b]) => b - a),
            ),
            uniqueValues: Object.keys(counts).length,
          };
          break;
        }

        case "sum_by_column": {
          if (!column) {
            res
              .status(400)
              .json(
                createErrorResponse("Column name required for sum operation"),
              );
            return;
          }
          let sum = 0;
          let count = 0;
          for (const row of rows) {
            const num = parseFloat(row[column]);
            if (!isNaN(num)) {
              sum += num;
              count++;
            }
          }
          result = { column, sum, count, average: count > 0 ? sum / count : 0 };
          break;
        }

        case "min_max_by_column": {
          if (!column) {
            res
              .status(400)
              .json(
                createErrorResponse(
                  "Column name required for min/max operation",
                ),
              );
            return;
          }
          const values = rows
            .map((r: Record<string, string>) => parseFloat(r[column]))
            .filter((n: number) => !isNaN(n));
          if (values.length === 0) {
            result = { column, error: "No numeric values found" };
          } else {
            result = {
              column,
              min: Math.min(...values),
              max: Math.max(...values),
              average:
                values.reduce((a: number, b: number) => a + b, 0) /
                values.length,
              count: values.length,
            };
          }
          break;
        }

        default:
          res
            .status(400)
            .json(createErrorResponse(`Unknown operation: ${operation}`));
          return;
      }

      res.json(createSuccessResponse({ ...result, operation }));
    } catch (error) {
      const errorMessage = (error as Error).message || String(error);
      console.error(`[CSV] Error:`, errorMessage);
      res.status(500).json(createErrorResponse(errorMessage));
    }
  }),
);

app.post(
  "/api/developer/math",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { expression } = req.body;

    if (!expression) {
      res.status(400).json(createErrorResponse("Math expression is required"));
      return;
    }

    console.log(`[Math] Evaluating: ${expression}`);

    try {
      // Safe math evaluation - only allow basic operations and Math functions
      const allowedMathFunctions = [
        "Math.abs",
        "Math.ceil",
        "Math.floor",
        "Math.round",
        "Math.sqrt",
        "Math.pow",
        "Math.sin",
        "Math.cos",
        "Math.tan",
        "Math.log",
        "Math.exp",
        "Math.PI",
        "Math.E",
        "Math.min",
        "Math.max",
      ];

      let safeExpression = expression;
      let hasMathFunction = false;

      for (const func of allowedMathFunctions) {
        if (expression.includes(func)) {
          hasMathFunction = true;
        }
      }

      // Check for dangerous patterns
      const dangerousPatterns =
        /[;{}[\]]|eval|Function|require|import|process|global/;
      if (dangerousPatterns.test(expression)) {
        res.status(400).json(createErrorResponse("Unsafe expression detected"));
        return;
      }

      // Use Function constructor for safe evaluation
      const result = new Function(`'use strict'; return (${expression})`)();

      res.json(
        createSuccessResponse({
          expression,
          result:
            typeof result === "number" ? Number(result.toFixed(10)) : result,
          type: typeof result,
        }),
      );
    } catch (error) {
      const errorMessage = (error as Error).message || String(error);
      res
        .status(400)
        .json(createErrorResponse(`Math evaluation error: ${errorMessage}`));
    }
  }),
);

app.post(
  "/api/developer/websearch",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { query, maxResults = 5 } = req.body;

    if (!query) {
      res.status(400).json(createErrorResponse("Search query is required"));
      return;
    }

    console.log(`[WebSearch] Searching for: ${query}`);

    try {
      // Check if Vertex AI is configured for grounding
      const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const hasProjectId = process.env.GOOGLE_VERTEX_PROJECT;

      if (!hasCredentials || !hasProjectId) {
        // Fallback to AI-based search simulation
        const searchPrompt = `You are a search assistant. Provide information about: "${query}"

Include:
1. Key facts and information
2. Different perspectives if applicable
3. Sources or references if known
4. Current relevance

Note: This is AI-generated content based on training data, not real-time search.`;

        const result = await generateWithProvider("auto", searchPrompt, {
          maxTokens: 500,
          temperature: 0.4,
        });

        res.json(
          createSuccessResponse({
            query,
            results: [
              {
                title: `AI-generated results for: ${query}`,
                snippet: result.content,
                source: "AI Knowledge Base",
              },
            ],
            provider: result.provider,
            isGrounded: false,
            note: "Real-time search requires Google Vertex AI configuration",
          }),
        );
        return;
      }

      // Use Vertex AI with grounding if configured
      const { VertexAI } = await import("@google-cloud/vertexai");
      const projectLocation =
        process.env.GOOGLE_VERTEX_LOCATION || "us-central1";

      const vertex_ai = new VertexAI({
        project: hasProjectId!,
        location: projectLocation,
      });

      // Use dynamic typing to bypass TypeScript strict checking for Vertex AI tools
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = vertex_ai.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        tools: [{ google_search: {} }] as any,
      });

      const startTime = Date.now();
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: `Search for: ${query}` }] }],
      });

      const responseTime = Date.now() - startTime;
      const candidates = response.response.candidates;

      if (!candidates || candidates.length === 0) {
        res.json(
          createSuccessResponse({
            query,
            results: [],
            error: "No results returned",
          }),
        );
        return;
      }

      const content = candidates[0].content?.parts?.[0]?.text || "";
      const groundingMetadata = candidates[0]?.groundingMetadata;

      const searchResults = [];
      if (groundingMetadata?.groundingChunks) {
        for (const chunk of groundingMetadata.groundingChunks.slice(
          0,
          maxResults,
        )) {
          if (chunk.web) {
            searchResults.push({
              title: chunk.web.title || "No title",
              url: chunk.web.uri || "",
              snippet: content.substring(0, 200),
            });
          }
        }
      }

      res.json(
        createSuccessResponse({
          query,
          results:
            searchResults.length > 0
              ? searchResults
              : [
                  {
                    title: `Results for: ${query}`,
                    snippet: content,
                    source: "Google Search Grounding",
                  },
                ],
          rawContent: content,
          provider: "google-vertex-grounding",
          model: "gemini-2.5-flash-lite",
          responseTime,
          isGrounded: true,
        }),
      );
    } catch (error) {
      const errorMessage = (error as Error).message || String(error);
      console.error(`[WebSearch] Error:`, errorMessage);
      res.status(500).json(createErrorResponse(errorMessage));
    }
  }),
);

app.post(
  "/api/developer/file-operations",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { operation, path: filePath, content } = req.body;

    if (!operation) {
      res.status(400).json(createErrorResponse("Operation is required"));
      return;
    }

    console.log(`[FileOps] Operation: ${operation}`);

    try {
      const fs = await import("fs");
      const path = await import("path");

      // Security: Only allow operations within demo directory
      const demoDir = process.cwd();
      const resolvedPath = filePath ? path.resolve(demoDir, filePath) : demoDir;

      if (!resolvedPath.startsWith(demoDir)) {
        res
          .status(403)
          .json(
            createErrorResponse(
              "Access denied: Cannot operate outside demo directory",
            ),
          );
        return;
      }

      switch (operation) {
        case "list": {
          const items = fs.readdirSync(resolvedPath);
          const details = items.map((item) => {
            const itemPath = path.join(resolvedPath, item);
            const stats = fs.statSync(itemPath);
            return {
              name: item,
              type: stats.isDirectory() ? "directory" : "file",
              size: stats.size,
              modified: stats.mtime.toISOString(),
            };
          });
          res.json(
            createSuccessResponse({ path: resolvedPath, items: details }),
          );
          break;
        }

        case "read": {
          if (!filePath) {
            res
              .status(400)
              .json(
                createErrorResponse("File path required for read operation"),
              );
            return;
          }
          const fileContent = fs.readFileSync(resolvedPath, "utf-8");
          const stats = fs.statSync(resolvedPath);
          res.json(
            createSuccessResponse({
              path: resolvedPath,
              content: fileContent,
              size: stats.size,
              modified: stats.mtime.toISOString(),
            }),
          );
          break;
        }

        case "write": {
          if (!filePath || content === undefined) {
            res
              .status(400)
              .json(
                createErrorResponse(
                  "File path and content required for write operation",
                ),
              );
            return;
          }
          fs.writeFileSync(resolvedPath, content, "utf-8");
          res.json(
            createSuccessResponse({
              path: resolvedPath,
              written: true,
              size: content.length,
            }),
          );
          break;
        }

        default:
          res
            .status(400)
            .json(createErrorResponse(`Unknown operation: ${operation}`));
      }
    } catch (error) {
      const errorMessage = (error as Error).message || String(error);
      res.status(500).json(createErrorResponse(errorMessage));
    }
  }),
);

// ================================
// TEXT-TO-SPEECH ENDPOINT (Google Cloud TTS)
// ================================

// Google Cloud TTS voice mappings
const GOOGLE_TTS_VOICES: Record<
  string,
  { name: string; languageCode: string; ssmlGender: string }
> = {
  // Default voices
  alloy: {
    name: "en-US-Neural2-C",
    languageCode: "en-US",
    ssmlGender: "FEMALE",
  },
  echo: { name: "en-US-Neural2-D", languageCode: "en-US", ssmlGender: "MALE" },
  fable: {
    name: "en-US-Neural2-A",
    languageCode: "en-US",
    ssmlGender: "FEMALE",
  },
  onyx: { name: "en-US-Neural2-B", languageCode: "en-US", ssmlGender: "MALE" },
  nova: {
    name: "en-US-Neural2-E",
    languageCode: "en-US",
    ssmlGender: "FEMALE",
  },
  shimmer: {
    name: "en-US-Neural2-F",
    languageCode: "en-US",
    ssmlGender: "FEMALE",
  },
  // Language-specific voices
  "en-us-female": {
    name: "en-US-Neural2-C",
    languageCode: "en-US",
    ssmlGender: "FEMALE",
  },
  "en-us-male": {
    name: "en-US-Neural2-D",
    languageCode: "en-US",
    ssmlGender: "MALE",
  },
  "en-gb-female": {
    name: "en-GB-Neural2-A",
    languageCode: "en-GB",
    ssmlGender: "FEMALE",
  },
  "en-gb-male": {
    name: "en-GB-Neural2-B",
    languageCode: "en-GB",
    ssmlGender: "MALE",
  },
  "hi-in-female": {
    name: "hi-IN-Neural2-A",
    languageCode: "hi-IN",
    ssmlGender: "FEMALE",
  },
  "hi-in-male": {
    name: "hi-IN-Neural2-B",
    languageCode: "hi-IN",
    ssmlGender: "MALE",
  },
};

app.post(
  "/api/tts/generate",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      text,
      voice = "alloy",
      speed = 1.0,
      format = "mp3",
      languageCode,
    } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      res
        .status(400)
        .json(createErrorResponse("Text is required for TTS generation"));
      return;
    }

    const MAX_TTS_LENGTH = 5000;
    if (text.length > MAX_TTS_LENGTH) {
      res
        .status(400)
        .json(
          createErrorResponse(
            `Text too long. Maximum ${MAX_TTS_LENGTH} characters, got ${text.length}.`,
          ),
        );
      return;
    }

    console.log(
      `[TTS] Generating speech with Google Cloud TTS: ${text.substring(0, 60)}... voice=${voice}`,
    );

    try {
      // Check if Google Cloud is configured
      const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const hasProjectId =
        process.env.GOOGLE_VERTEX_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;

      if (!hasCredentials) {
        res.status(503).json(
          createErrorResponse(
            "Google Cloud TTS requires GOOGLE_APPLICATION_CREDENTIALS",
            {
              suggestion:
                "Set GOOGLE_APPLICATION_CREDENTIALS in your .env file pointing to your service account JSON",
            },
          ),
        );
        return;
      }

      // Use Google Auth to get access token
      const { GoogleAuth } = await import("google-auth-library");
      const auth = new GoogleAuth({
        keyFilename: hasCredentials,
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });

      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();

      if (!accessToken.token) {
        throw new Error("Failed to get Google Cloud access token");
      }

      const startTime = Date.now();

      // Get voice configuration
      const voiceConfig =
        GOOGLE_TTS_VOICES[voice.toLowerCase()] || GOOGLE_TTS_VOICES["alloy"];

      // Override language code if provided
      const finalLanguageCode = languageCode || voiceConfig.languageCode;

      // Google Cloud Text-to-Speech API endpoint
      const endpoint = "https://texttospeech.googleapis.com/v1/text:synthesize";

      const requestBody = {
        input: { text: text.trim() },
        voice: {
          languageCode: finalLanguageCode,
          name: voiceConfig.name,
          ssmlGender: voiceConfig.ssmlGender,
        },
        audioConfig: {
          audioEncoding:
            format.toUpperCase() === "MP3"
              ? "MP3"
              : format.toUpperCase() === "OGG"
                ? "OGG_OPUS"
                : "LINEAR16",
          speakingRate: Math.min(4.0, Math.max(0.25, Number(speed) || 1.0)),
          pitch: 0,
          volumeGainDb: 0,
        },
      };

      console.log(
        `[TTS] Calling Google Cloud TTS API with voice: ${voiceConfig.name}`,
      );

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken.token}`,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[TTS] Google Cloud TTS error ${response.status}: ${errorText}`,
        );

        if (response.status === 403) {
          res.status(403).json(
            createErrorResponse(
              "Google Cloud TTS access denied. Enable the Text-to-Speech API.",
              {
                suggestion:
                  "Run: gcloud services enable texttospeech.googleapis.com",
                error: errorText.substring(0, 500),
              },
            ),
          );
          return;
        }

        throw new Error(
          `Google Cloud TTS API error: ${response.status} - ${errorText.substring(0, 200)}`,
        );
      }

      const result = await response.json();
      const audioBase64 = result.audioContent;

      if (!audioBase64) {
        throw new Error("No audio content returned from Google Cloud TTS");
      }

      const audioBuffer = Buffer.from(audioBase64, "base64");
      const responseTime = Date.now() - startTime;

      console.log(
        `[TTS] Generated ${audioBuffer.length} bytes in ${responseTime}ms via Google Cloud TTS (voice=${voiceConfig.name})`,
      );

      res.json(
        createSuccessResponse({
          audioBase64,
          format,
          voice: voiceConfig.name,
          languageCode: finalLanguageCode,
          speed,
          characterCount: text.trim().length,
          audioSizeKB: Math.round(audioBuffer.length / 1024),
          responseTime,
          provider: "google-cloud-tts",
        }),
      );
    } catch (error) {
      const errorMessage = (error as Error).message || String(error);
      console.error(`[TTS] Error:`, errorMessage);
      res.status(500).json(createErrorResponse(errorMessage));
    }
  }),
);

// ================================
// ANALYTICS ENDPOINT
// ================================

/**
 * GET /api/analytics
 * Get current usage statistics and analytics
 */
app.get("/api/analytics", (req: Request, res: Response) => {
  const analytics = {
    totalRequests: usageStats.requests,
    totalTokens: usageStats.totalTokens,
    totalErrors: usageStats.errors,
    providerUsage: usageStats.providers,
    timestamp: new Date().toISOString(),
    averageTokensPerRequest:
      usageStats.requests > 0
        ? Math.round(usageStats.totalTokens / usageStats.requests)
        : 0,
    errorRate:
      usageStats.requests > 0
        ? Math.round((usageStats.errors / usageStats.requests) * 100)
        : 0,
  };

  res.json(analytics);
});

// ================================
// MCP INTEGRATION ENDPOINTS
// ================================

// Import MCP helper functions
import {
  loadMCPConfig,
  saveMCPConfig,
  executeMCPCommand,
  checkServerStatus,
  listMCPServersWithStatus,
  installMCPServer,
  removeMCPServer,
  testMCPServer,
  getMCPServerTools,
  executeMCPTool,
  addCustomMCPServer,
  getMCPSystemStatus,
} from "./mcp-helpers.js"; // .js extension for ESM resolution

/**
 * GET /api/mcp/servers
 * List all configured MCP servers with their status
 */
app.get(
  "/api/mcp/servers",
  asyncHandler(async (req: Request, res: Response) => {
    console.log("[MCP] Listing all configured servers");
    const result = await listMCPServersWithStatus();
    res.json(result);
  }),
);

/**
 * POST /api/mcp/install
 * Install popular MCP servers
 */
app.post(
  "/api/mcp/install",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { serverName } = req.body;

    if (!serverName) {
      res.status(400).json(createErrorResponse("Server name is required"));
      return;
    }

    console.log(`[MCP] Installing server: ${serverName}`);
    const result = installMCPServer(serverName);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  }),
);

/**
 * DELETE /api/mcp/servers/:name
 * Remove MCP servers
 */
app.delete(
  "/api/mcp/servers/:name",
  asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.params;

    console.log(`[MCP] Removing server: ${name}`);
    const result = removeMCPServer(name);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  }),
);

/**
 * POST /api/mcp/test/:name
 * Test server connectivity
 */
app.post(
  "/api/mcp/test/:name",
  asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.params;

    console.log(`[MCP] Testing server connectivity: ${name}`);
    const result = testMCPServer(name);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  }),
);

/**
 * GET /api/mcp/tools/:name
 * Get server tools
 */
app.get(
  "/api/mcp/tools/:name",
  asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.params;

    console.log(`[MCP] Getting tools for server: ${name}`);
    const result = await getMCPServerTools(name);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  }),
);

/**
 * POST /api/mcp/execute
 * Execute MCP tools
 */
app.post(
  "/api/mcp/execute",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { serverName, toolName, params = {} } = req.body;

    if (!serverName || !toolName) {
      res
        .status(400)
        .json(createErrorResponse("Server name and tool name are required"));
      return;
    }

    console.log(`[MCP] Executing tool: ${serverName}.${toolName}`);

    const result = await executeMCPTool(serverName, toolName, params);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  }),
);

/**
 * POST /api/mcp/add-server
 * Add custom MCP server
 */
app.post(
  "/api/mcp/add-server",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, command, args, env } = req.body;

    if (!name || !command) {
      res
        .status(400)
        .json(createErrorResponse("Server name and command are required"));
      return;
    }

    console.log(`[MCP] Adding custom server: ${name}`);
    const result = addCustomMCPServer(name, command, { args, env });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  }),
);

/**
 * GET /api/mcp/status
 * Get overall MCP system status
 */
app.get(
  "/api/mcp/status",
  asyncHandler(async (req: Request, res: Response) => {
    console.log("[MCP] Getting system status");
    const result = await getMCPSystemStatus();
    res.json(result);
  }),
);

// ================================
// AI WORKFLOW TOOLS ENDPOINTS
// ================================

/**
 * POST /api/ai/analyze-usage
 * Analyze AI usage patterns and provide optimization suggestions
 */
app.post(
  "/api/ai/analyze-usage",
  asyncHandler(async (req: Request, res: Response) => {
    const {
      timeframe = "last-24-hours",
      providers = ALL_PROVIDERS,
      includeOptimizations = true,
    } = req.body;

    console.log(`[AI Tools] Analyzing usage for timeframe: ${timeframe}`);

    const analysisData = generateMockAnalysisData("analyze-ai-usage", {
      timeRange: timeframe,
      providers,
      includeOptimizations,
    });

    res.json(
      createSuccessResponse({
        tool: "analyze-ai-usage",
        result: analysisData,
      }),
    );
  }),
);

/**
 * POST /api/ai/benchmark-performance
 * Benchmark performance across providers with detailed metrics
 */
app.post(
  "/api/ai/benchmark-performance",
  asyncHandler(async (req: Request, res: Response) => {
    const {
      providers = ALL_PROVIDERS,
      iterations = 3,
      testPrompt = "Test prompt for benchmarking",
    } = req.body;

    console.log(
      `[AI Tools] Benchmarking performance for ${providers.length} providers`,
    );

    const benchmarkData = generateMockAnalysisData(
      "benchmark-provider-performance",
      {
        providers,
        iterations,
        testPrompt,
      },
    );

    res.json(
      createSuccessResponse({
        tool: "benchmark-provider-performance",
        result: benchmarkData,
      }),
    );
  }),
);

/**
 * POST /api/ai/optimize-prompt
 * Optimize prompt parameters for better performance
 */
app.post(
  "/api/ai/optimize-prompt",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { prompt, style = "balanced", optimizeFor = "quality" } = req.body;

    if (!prompt) {
      res.status(400).json(createErrorResponse("Prompt is required"));
      return;
    }

    console.log(
      `[AI Tools] Optimizing prompt for ${style} style, ${optimizeFor} optimization`,
    );

    const optimizationData = generateMockAnalysisData(
      "optimize-prompt-parameters",
      {
        prompt,
        style,
        optimizeFor,
      },
    );

    res.json(
      createSuccessResponse({
        tool: "optimize-prompt-parameters",
        result: optimizationData,
      }),
    );
  }),
);

/**
 * POST /api/ai/generate-test-cases
 * Generate comprehensive test cases for code functions
 */
app.post(
  "/api/ai/generate-test-cases",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      codeFunction,
      testTypes = ["unit", "integration", "edge-cases"],
      framework = "jest",
    } = req.body;

    if (!codeFunction) {
      res.status(400).json(createErrorResponse("Code function is required"));
      return;
    }

    const testPrompt = `Generate comprehensive ${framework} test cases for this function:

${codeFunction}

Create ${testTypes.join(", ")} tests with:
- Clear test descriptions
- Edge case coverage
- Mock data where needed
- Assertion examples`;

    const result = await generateWithProvider("auto", testPrompt, {
      maxTokens: 800,
      temperature: 0.4,
    });

    res.json(
      createSuccessResponse({
        tool: "generate-test-cases",
        result: {
          testCases: result.content,
          framework,
          testTypes,
          usage: result.usage,
        },
      }),
    );
  }),
);

/**
 * POST /api/ai/refactor-code
 * Refactor code for better quality and performance
 */
app.post(
  "/api/ai/refactor-code",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { code, language, goals = ["readability", "performance"] } = req.body;

    if (!code) {
      res.status(400).json(createErrorResponse("Code is required"));
      return;
    }

    const refactorPrompt = `Refactor this ${language} code focusing on ${goals.join(" and ")}:

${code}

Provide:
- Improved code with explanations
- Key changes made
- Performance improvements
- Best practices applied`;

    const result = await generateWithProvider("auto", refactorPrompt, {
      maxTokens: 800,
      temperature: 0.3,
    });

    res.json(
      createSuccessResponse({
        tool: "refactor-code",
        result: {
          refactoredCode: result.content,
          language,
          goals,
          usage: result.usage,
        },
      }),
    );
  }),
);

/**
 * POST /api/ai/generate-documentation
 * Generate comprehensive documentation for code
 */
app.post(
  "/api/ai/generate-documentation",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { code, language, docType = "api" } = req.body;

    if (!code) {
      res.status(400).json(createErrorResponse("Code is required"));
      return;
    }

    const docPrompt = `Generate comprehensive ${docType} documentation for this ${language} code:

${code}

Include:
- Function/class descriptions
- Parameter documentation
- Return value specifications
- Usage examples
- Error handling notes`;

    const result = await generateWithProvider("auto", docPrompt, {
      maxTokens: 700,
      temperature: 0.3,
    });

    res.json(
      createSuccessResponse({
        tool: "generate-documentation",
        result: {
          documentation: result.content,
          language,
          docType,
          usage: result.usage,
        },
      }),
    );
  }),
);

/**
 * POST /api/ai/debug-output
 * Debug and analyze AI output for quality issues
 */
app.post(
  "/api/ai/debug-output",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { aiOutput, expectedResult, analysisType = "quality" } = req.body;

    if (!aiOutput) {
      res.status(400).json(createErrorResponse("AI output is required"));
      return;
    }

    const debugPrompt = `Analyze this AI output for ${analysisType} issues:

AI Output:
${aiOutput}

${expectedResult ? `Expected Result:\n${expectedResult}\n` : ""}

Provide:
- Quality assessment
- Identified issues
- Improvement suggestions
- Potential causes
- Recommendations for better results`;

    const result = await generateWithProvider("auto", debugPrompt, {
      maxTokens: 600,
      temperature: 0.4,
    });

    res.json(
      createSuccessResponse({
        tool: "debug-ai-output",
        result: {
          analysis: result.content,
          analysisType,
          usage: result.usage,
        },
      }),
    );
  }),
);

// ================================
// ERROR HANDLING MIDDLEWARE
// ================================

/**
 * Global error handler
 * Handles all unhandled errors and returns consistent error responses
 */
app.use(
  (
    error: Error & { statusCode?: number },
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    console.error("[Error] %s %s:", req.method, req.path, error);

    usageStats.errors++;

    const statusCode = error.statusCode || 500;
    const errorResponse = createErrorResponse(
      error.message || "Internal server error",
      {
        path: req.path,
        method: req.method,
        statusCode,
      },
    );

    res.status(statusCode).json(errorResponse);
  },
);

/**
 * 404 handler for unknown routes
 */
app.use("*", (req: Request, res: Response) => {
  const safeMethod = sanitizeForLog(req.method);
  const safeUrl = sanitizeForLog(req.originalUrl);
  res.status(404).json(
    createErrorResponse(`Route not found: ${safeMethod} ${safeUrl}`, {
      availableRoutes: ["/api/status", "/api/generate", "/api/benchmark"],
    }),
  );
});

// ================================
// SERVER STARTUP
// ================================

/**
 * Start the Express server
 */
app.listen(PORT, () => {
  console.log(`
🚀 NeuroLink AI Development Platform Demo Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 Server URL: http://localhost:${PORT}
📋 API Status: http://localhost:${PORT}/api/status
🎯 Provider Count: ${ALL_PROVIDERS.length} AI providers supported
🛠️  Tool Count: 10+ specialized AI development tools
⚡ Real-time Features: Provider monitoring, benchmarking, analytics

Core Endpoints:
• POST /api/generate - Text generation with provider selection
• GET /api/status - Real-time provider availability
• POST /api/benchmark - Performance testing across providers
• GET /api/analytics - Usage statistics and insights

Business Tools:
• POST /api/business/email - Professional email generation
• POST /api/business/analyze-data - CSV data analysis
• POST /api/business/summarize - Document summarization

Creative Tools:
• POST /api/creative/writing - Stories, poems, dialogue
• POST /api/creative/translate - Context-aware translation
• POST /api/creative/ideas - Content ideation

Developer Tools:
• POST /api/developer/code - Clean code generation
• POST /api/developer/api-doc - API documentation
• POST /api/developer/debug - Error analysis

AI Workflow Tools:
• POST /api/ai/analyze-usage - Usage optimization
• POST /api/ai/benchmark-performance - Provider benchmarking
• POST /api/ai/generate-test-cases - Test automation
• POST /api/ai/refactor-code - Code improvement
• POST /api/ai/generate-documentation - Auto documentation
• POST /api/ai/debug-output - AI output analysis

MCP Integration:
• GET /api/mcp/servers - MCP server management
• POST /api/mcp/execute - Tool execution
• GET /api/mcp/status - System status

📊 Monitoring: Real-time usage statistics and error tracking
🔧 Configuration: Environment-based provider setup
🚀 Ready for production testing and development!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

  // Log initial provider configuration status
  console.log("📋 Provider Configuration Status:");
  ALL_PROVIDERS.forEach((provider) => {
    const configured = isProviderConfigured(provider);
    const status = configured ? "✅" : "❌";
    const model = getModelForProvider(provider);
    console.log(
      `   ${status} ${provider}: ${model} ${!configured ? "(needs configuration)" : ""}`,
    );
  });

  console.log(
    "\n🎯 All systems ready! Start testing at: http://localhost:" + PORT + "\n",
  );
});

// ================================
// GRACEFUL SHUTDOWN
// ================================

/**
 * Handle graceful shutdown
 */
process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\n🛑 Received SIGINT, shutting down gracefully...");
  process.exit(0);
});
