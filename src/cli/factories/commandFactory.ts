import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import type { Argv, CommandModule } from "yargs";
import { ModelResolver } from "../../lib/models/modelResolver.js";
import type {
  ChunkingStrategy,
  JsonValue,
  AnalyticsData,
  TokenUsage,
  BaseCommandArgs,
  BatchCommandArgs,
  GenerateCommandArgs,
  CliGenerateResult,
  StreamCommandArgs,
  ConversationMemoryConfig,
  ConversationSummary,
  AnthropicAuthConfig,
  AnthropicAuthMethod,
  ClaudeSubscriptionTier,
} from "../../lib/types/index.js";
import { globalSession } from "../../lib/session/globalSessionState.js";
// Use TokenUsage from standard types - no local interface needed
import {
  type BaseContext,
  type ContextConfig,
  ContextFactory,
} from "../../lib/types/index.js";
import { checkRedisAvailability } from "../../lib/utils/conversationMemory.js";
import { normalizeEvaluationData } from "../../lib/utils/evaluationUtils.js";
import { logger } from "../../lib/utils/logger.js";
import { createThinkingConfigFromRecord } from "../../lib/utils/thinkingConfig.js";
import { configManager } from "../commands/config.js";
import { MCPCommandFactory } from "../commands/mcp.js";
import { ModelsCommandFactory } from "../commands/models.js";
import { handleSetup } from "../commands/setup.js";
import { handleError } from "../errorHandler.js";
import { LoopSession } from "../loop/session.js";
import { initializeCliParser } from "../parser.js";
import { formatFileSize, saveAudioToFile } from "../utils/audioFileUtils.js";
import { resolveFilePaths } from "../utils/pathResolver.js";
import { animatedWrite } from "../utils/typewriter.js";
import { createStreamAbortHandler } from "../utils/abortHandler.js";
import {
  formatVideoFileSize,
  getVideoMetadataSummary,
  saveVideoToFile,
} from "../utils/videoFileUtils.js";
import { OllamaCommandFactory } from "./ollamaCommandFactory.js";
import { SageMakerCommandFactory } from "./sagemakerCommandFactory.js";

/**
 * CLI Command Factory for generate commands
 */
export class CLICommandFactory {
  // Common options available on all commands
  private static readonly commonOptions = {
    // Core generation options
    provider: {
      choices: [
        "auto",
        "openai",
        "openai-compatible",
        "openrouter",
        "or",
        "bedrock",
        "vertex",
        "googleVertex",
        "anthropic",
        "anthropic-subscription", // Anthropic with subscription tier support
        "azure",
        "google-ai",
        "google-ai-studio",
        "huggingface",
        "ollama",
        "mistral",
        "litellm",
        "sagemaker",
      ],
      default: "auto",
      description:
        "AI provider to use (auto-selects best available). Use 'anthropic-subscription' for Claude subscription plans.",
      alias: "p",
    },
    // Anthropic subscription options
    authMethod: {
      type: "string" as const,
      choices: ["api-key", "oauth"],
      default: "api-key",
      description:
        "Authentication method for Anthropic: 'api-key' (default) or 'oauth' (for subscription plans)",
    },
    subscriptionTier: {
      type: "string" as const,
      choices: ["free", "pro", "max", "max_5", "max_20", "api"],
      description:
        "Anthropic subscription tier: free (limited), pro ($20/mo), max (highest limits), max_5/max_20 (extended), api (pay-per-use)",
    },
    enableBeta: {
      type: "boolean" as const,
      default: false,
      description:
        "Enable Anthropic beta features (experimental capabilities, computer use, etc.)",
      alias: "beta",
    },
    image: {
      type: "string" as const,
      description:
        "Add image file for multimodal analysis (can be used multiple times)",
      alias: "i",
    },
    csv: {
      type: "string" as const,
      description:
        "Add CSV file for data analysis (can be used multiple times)",
      alias: "c",
    },
    pdf: {
      type: "string" as const,
      description: "Add PDF file for analysis (can be used multiple times)",
    },
    video: {
      type: "string" as const,
      description:
        "Add video file for analysis (can be used multiple times) (MP4, WebM, MOV, AVI, MKV)",
    },
    "video-frames": {
      type: "number" as const,
      default: 8,
      description: "Number of frames to extract (default: 8)",
    },
    "video-quality": {
      type: "number" as const,
      default: 85,
      description: "Frame quality 0-100 (default: 85)",
    },
    "video-format": {
      type: "string" as const,
      choices: ["jpeg", "png"],
      default: "jpeg",
      description: "Frame format (default: jpeg)",
    },
    "transcribe-audio": {
      type: "boolean" as const,
      default: false,
      description: "Extract and transcribe audio from video",
    },
    file: {
      type: "string" as const,
      description:
        "Add file with auto-detection (CSV, image, etc. - can be used multiple times)",
    },
    csvMaxRows: {
      type: "number" as const,
      default: 1000,
      description: "Maximum number of CSV rows to process",
    },
    csvFormat: {
      type: "string" as const,
      choices: ["raw", "markdown", "json"],
      default: "raw",
      description:
        "CSV output format:\n" +
        "  • raw: Plain CSV text (fastest, minimal tokens, best for large files)\n" +
        "  • markdown: Formatted table (readable, best for small files <100 rows)\n" +
        "  • json: Structured JSON array (best for programmatic use, higher tokens)",
    },
    model: {
      type: "string" as const,
      description:
        "Specific model to use (e.g. gemini-2.5-pro, gemini-2.5-flash)",
      alias: "m",
    },
    temperature: {
      type: "number" as const,
      default: 0.7,
      description: "Creativity level (0.0 = focused, 1.0 = creative)",
      alias: "t",
    },
    maxTokens: {
      type: "number" as const,
      default: 1000,
      description: "Maximum tokens to generate",
      alias: "max",
    },
    system: {
      type: "string" as const,
      description: "System prompt to guide AI behavior",
      alias: "s",
    },

    // Output control options
    format: {
      choices: ["text", "json", "table"],
      default: "text",
      alias: ["f", "output-format"],
      description: "Output format",
    },
    output: {
      type: "string" as const,
      description: "Save output to file",
      alias: "o",
    },
    imageOutput: {
      type: "string" as const,
      description:
        "Custom path for generated image (default: generated-images/image-<timestamp>.png)",
      alias: "image-output",
    },

    // Behavior control options
    timeout: {
      type: "number" as const,
      default: 120,
      description: "Maximum execution time in seconds",
    },
    delay: {
      type: "number" as const,
      description: "Delay between operations (ms)",
    },

    // Tools & features options
    disableTools: {
      type: "boolean" as const,
      default: false,
      description: "Disable MCP tool integration (tools enabled by default)",
    },
    enableAnalytics: {
      type: "boolean" as const,
      default: false,
      description: "Enable usage analytics collection",
    },
    enableEvaluation: {
      type: "boolean" as const,
      default: false,
      description: "Enable AI response quality evaluation",
    },
    domain: {
      type: "string" as const,
      choices: [
        "healthcare",
        "finance",
        "analytics",
        "ecommerce",
        "education",
        "legal",
        "technology",
        "generic",
        "auto",
      ],
      description: "Domain type for specialized processing and optimization",
      alias: "d",
    },
    evaluationDomain: {
      type: "string" as const,
      description:
        "Domain expertise for evaluation (e.g., 'AI coding assistant', 'Customer service expert')",
    },
    toolUsageContext: {
      type: "string" as const,
      description:
        "Tool usage context for evaluation (e.g., 'Used sales-data MCP tools')",
    },
    domainAware: {
      type: "boolean" as const,
      default: false,
      description: "Use domain-aware evaluation",
    },
    context: {
      type: "string" as const,
      description: "JSON context object for custom data",
    },

    // Debug & output options
    debug: {
      type: "boolean" as const,
      alias: ["v", "verbose"],
      default: false,
      description: "Enable debug mode with verbose output",
    },
    quiet: {
      type: "boolean" as const,
      alias: "q",
      default: true,
      description: "Suppress non-essential output",
    },
    noColor: {
      type: "boolean" as const,
      default: false,
      description: "Disable colored output (useful for CI/scripts)",
    },
    configFile: {
      type: "string" as const,
      description: "Path to custom configuration file",
    },
    dryRun: {
      type: "boolean" as const,
      default: false,
      description: "Test command without making actual API calls (for testing)",
    },

    // TTS (Text-to-Speech) options
    tts: {
      type: "boolean" as const,
      default: false,
      description: "Enable text-to-speech output",
    },
    ttsVoice: {
      type: "string" as const,
      description: "TTS voice to use (e.g., 'en-US-Neural2-C')",
    },
    ttsFormat: {
      type: "string" as const,
      choices: ["mp3", "wav", "ogg", "opus"],
      default: "mp3",
      description: "Audio output format",
    },
    ttsSpeed: {
      type: "number" as const,
      default: 1.0,
      description: "Speaking rate (0.25-4.0, default: 1.0)",
    },
    ttsQuality: {
      type: "string" as const,
      choices: ["standard", "hd"],
      default: "standard",
      description: "Audio quality level",
    },
    ttsOutput: {
      type: "string" as const,
      description:
        "Save TTS audio to file (supports absolute and relative paths)",
    },
    ttsPlay: {
      type: "boolean" as const,
      default: false,
      description: "Auto-play generated audio",
    },

    // Video Generation options (Veo 3.1)
    outputMode: {
      type: "string" as const,
      choices: ["text", "video", "ppt"],
      default: "text",
      description:
        "Output mode: 'text' for standard generation, 'video' for video, 'ppt' for presentation",
    },
    videoOutput: {
      type: "string" as const,
      alias: "vo",
      description: "Path to save generated video file (e.g., ./output.mp4)",
    },
    videoResolution: {
      type: "string" as const,
      choices: ["720p", "1080p"],
      default: "720p",
      description: "Video output resolution (720p or 1080p)",
    },
    videoLength: {
      type: "number" as const,
      choices: [4, 6, 8],
      default: 4,
      description: "Video duration in seconds (4, 6, or 8)",
    },
    videoAspectRatio: {
      type: "string" as const,
      choices: ["9:16", "16:9"],
      default: "16:9",
      description: "Video aspect ratio (9:16 for portrait, 16:9 for landscape)",
    },
    videoAudio: {
      type: "boolean" as const,
      default: true,
      description: "Enable/disable audio generation in video",
    },

    // PPT Generation options
    pptPages: {
      type: "number" as const,
      alias: "pages",
      description:
        "Number of slides to generate (5-50, default: 10 when PPT mode is enabled)",
    },
    pptTheme: {
      type: "string" as const,
      choices: ["modern", "corporate", "creative", "minimal", "dark"],
      description:
        "Presentation theme/style (default: AI selects based on topic)",
    },
    pptAudience: {
      type: "string" as const,
      choices: ["business", "students", "technical", "general"],
      description: "Target audience (default: AI selects based on topic)",
    },
    pptTone: {
      type: "string" as const,
      choices: ["professional", "casual", "educational", "persuasive"],
      description: "Presentation tone (default: AI selects based on topic)",
    },
    pptOutput: {
      type: "string" as const,
      alias: "po",
      description: "Path to save generated PPTX file (e.g., ./output.pptx)",
    },
    pptAspectRatio: {
      type: "string" as const,
      choices: ["16:9", "4:3"],
      description:
        "Slide aspect ratio (default: 16:9 when PPT mode is enabled)",
    },
    pptNoImages: {
      type: "boolean" as const,
      default: false,
      description: "Disable AI image generation for slides",
    },

    thinking: {
      alias: "think",
      type: "boolean" as const,
      description: "Enable extended thinking/reasoning capability",
      default: false,
    },
    thinkingBudget: {
      type: "number" as const,
      description:
        "Token budget for extended thinking - Anthropic Claude and Gemini 2.5+ models (5000-100000)",
      default: 10000,
    },
    thinkingLevel: {
      type: "string" as const,
      description:
        "Thinking level for extended reasoning (Anthropic Claude, Gemini 2.5+, Gemini 3): minimal, low, medium, high",
      choices: ["minimal", "low", "medium", "high"] as const,
    },
    region: {
      type: "string" as const,
      description:
        "Vertex AI region (e.g., us-central1, europe-west1, asia-northeast1)",
      alias: "r",
    },

    // RAG options
    ragFiles: {
      type: "array" as const,
      description:
        "File paths to load for RAG (Retrieval-Augmented Generation). AI will search these documents to answer your question.",
      alias: "rag-files",
      string: true,
    },
    ragStrategy: {
      type: "string" as const,
      description:
        "Chunking strategy for RAG documents (auto-detected from file extension if not specified)",
      alias: "rag-strategy",
      choices: [
        "character",
        "recursive",
        "sentence",
        "token",
        "markdown",
        "html",
        "json",
        "latex",
        "semantic",
        "semantic-markdown",
      ] as const,
    },
    ragChunkSize: {
      type: "number" as const,
      description: "Maximum chunk size in characters for RAG documents",
      alias: "rag-chunk-size",
      default: 1000,
    },
    ragChunkOverlap: {
      type: "number" as const,
      description: "Overlap between adjacent chunks for RAG documents",
      alias: "rag-chunk-overlap",
      default: 200,
    },
    ragTopK: {
      type: "number" as const,
      description: "Number of top results to retrieve for RAG",
      alias: "rag-top-k",
      default: 5,
    },
  };

  // Helper method to build options for commands
  private static buildOptions(yargs: Argv, additionalOptions = {}) {
    return yargs.options({
      ...CLICommandFactory.commonOptions,
      ...additionalOptions,
    });
  }

  // Helper method to process CLI images with smart auto-detection
  private static processCliImages(
    images?: string | string[],
  ): Array<Buffer | string> | undefined {
    if (!images) {
      return undefined;
    }

    const imagePaths = Array.isArray(images) ? images : [images];

    // Resolve relative paths to absolute paths before returning
    // URLs are preserved as-is by resolveFilePaths
    // File paths will be converted to base64 by the message builder
    return resolveFilePaths(imagePaths);
  }

  // Helper method to process CLI CSV files
  private static processCliCSVFiles(
    csvFiles?: string | string[],
  ): Array<Buffer | string> | undefined {
    if (!csvFiles) {
      return undefined;
    }
    const paths = Array.isArray(csvFiles) ? csvFiles : [csvFiles];
    // Resolve relative paths to absolute paths before returning
    // URLs are preserved as-is by resolveFilePaths
    return resolveFilePaths(paths);
  }

  // Helper method to process CLI PDF files
  private static processCliPDFFiles(
    pdfFiles?: string | string[],
  ): Array<Buffer | string> | undefined {
    if (!pdfFiles) {
      return undefined;
    }
    const paths = Array.isArray(pdfFiles) ? pdfFiles : [pdfFiles];
    // Resolve relative paths to absolute paths before returning
    // URLs are preserved as-is by resolveFilePaths
    return resolveFilePaths(paths);
  }

  // Helper method to process CLI files with auto-detection
  private static processCliFiles(
    files?: string | string[],
  ): Array<Buffer | string> | undefined {
    if (!files) {
      return undefined;
    }
    const paths = Array.isArray(files) ? files : [files];
    // Resolve relative paths to absolute paths before returning
    // URLs are preserved as-is by resolveFilePaths
    return resolveFilePaths(paths);
  }

  // Helper method to process CLI video files
  private static processCliVideoFiles(
    videoFiles?: string | string[],
  ): Array<Buffer | string> | undefined {
    if (!videoFiles) {
      return undefined;
    }
    const paths = Array.isArray(videoFiles) ? videoFiles : [videoFiles];
    // Resolve relative paths to absolute paths before returning
    // URLs are preserved as-is by resolveFilePaths
    return resolveFilePaths(paths);
  }

  private static isNonLocalFileReference(filePath: string): boolean {
    const lower = filePath.toLowerCase();
    return (
      lower.startsWith("http://") ||
      lower.startsWith("https://") ||
      lower.startsWith("file://") ||
      lower.startsWith("data:")
    );
  }

  private static validateCliInputFiles(argv: Record<string, unknown>): void {
    const fileArgs: Array<{
      option: "--image" | "--csv" | "--pdf" | "--video" | "--file";
      value?: string | string[];
    }> = [
      { option: "--image", value: argv.image as string | string[] | undefined },
      { option: "--csv", value: argv.csv as string | string[] | undefined },
      { option: "--pdf", value: argv.pdf as string | string[] | undefined },
      { option: "--video", value: argv.video as string | string[] | undefined },
      { option: "--file", value: argv.file as string | string[] | undefined },
    ];

    const missingPaths: string[] = [];

    for (const { option, value } of fileArgs) {
      if (!value) {
        continue;
      }

      const rawPaths = Array.isArray(value) ? value : [value];
      const resolvedPaths = resolveFilePaths(rawPaths);

      for (let i = 0; i < resolvedPaths.length; i++) {
        const resolvedPath = resolvedPaths[i];
        if (CLICommandFactory.isNonLocalFileReference(resolvedPath)) {
          continue;
        }

        if (!fs.existsSync(resolvedPath)) {
          missingPaths.push(
            `${option} path not found: ${rawPaths[i]} (resolved to ${resolvedPath})`,
          );
        }
      }
    }

    if (missingPaths.length > 0) {
      throw new Error(
        `One or more input files do not exist:\n${missingPaths.join("\n")}`,
      );
    }
  }

  // Helper method to process common options
  private static processOptions(
    argv: BaseCommandArgs & Record<string, unknown>,
  ) {
    // Handle noColor option by disabling chalk
    if (argv.noColor) {
      process.env.FORCE_COLOR = "0";
    }

    // Process context using ContextFactory for type-safe integration
    let processedContext: BaseContext | undefined;
    let contextConfig: Partial<ContextConfig> | undefined;

    if (argv.context) {
      let rawContext;
      if (typeof argv.context === "string") {
        try {
          rawContext = JSON.parse(argv.context);
        } catch (err) {
          const contextStr = argv.context as string;
          const truncatedJson =
            contextStr.length > 100
              ? `${contextStr.slice(0, 100)}...`
              : contextStr;
          handleError(
            new Error(
              `Invalid JSON in --context parameter: ${(err as Error).message}. Received: ${truncatedJson}`,
            ),
            "Context parsing",
          );
        }
      } else {
        rawContext = argv.context;
      }

      const validatedContext = ContextFactory.validateContext(rawContext);
      if (validatedContext) {
        processedContext = validatedContext;

        // Configure context integration based on CLI usage
        contextConfig = {
          mode: "prompt_prefix", // Add context as prompt prefix for CLI usage
          includeInPrompt: true,
          includeInAnalytics: true,
          includeInEvaluation: true,
          maxLength: 500, // Reasonable limit for CLI context
        };
      } else if (argv.debug) {
        logger.debug("Invalid context provided, skipping context integration");
      }
    }

    return {
      provider:
        argv.provider === "auto"
          ? undefined
          : (argv.provider as string | undefined),
      model: argv.model as string | undefined,
      temperature: argv.temperature as number | undefined,
      maxTokens: argv.maxTokens as number | undefined,
      systemPrompt: argv.system as string | undefined,
      timeout: argv.timeout as number | undefined,
      disableTools: argv.disableTools as boolean | undefined,
      enableAnalytics: argv.enableAnalytics as boolean | undefined,
      enableEvaluation: argv.enableEvaluation as boolean | undefined,
      domain: argv.domain as string | undefined,
      evaluationDomain: argv.evaluationDomain as string | undefined,
      toolUsageContext: argv.toolUsageContext as string | undefined,
      domainAware: argv.domainAware as boolean | undefined,
      context: processedContext,
      contextConfig,
      debug: argv.debug as boolean | undefined,
      quiet: argv.quiet as boolean | undefined,
      format: argv.format as "text" | "json" | "table" | "yaml" | undefined,
      output: argv.output as string | undefined,
      imageOutput: argv.imageOutput as string | undefined,
      delay: argv.delay as number | undefined,
      noColor: argv.noColor as boolean | undefined,
      configFile: argv.configFile as string | undefined,
      dryRun: argv.dryRun as boolean | undefined,
      // TTS options
      tts: argv.tts as boolean | undefined,
      ttsVoice: argv.ttsVoice as string | undefined,
      ttsFormat: argv.ttsFormat as "mp3" | "wav" | "ogg" | "opus" | undefined,
      ttsSpeed: argv.ttsSpeed as number | undefined,
      ttsQuality: argv.ttsQuality as "standard" | "hd" | undefined,
      ttsOutput: argv.ttsOutput as string | undefined,
      ttsPlay: argv.ttsPlay as boolean | undefined,
      // Video generation options (Veo 3.1)
      outputMode: argv.outputMode as "text" | "video" | "ppt" | undefined,
      videoOutput: argv.videoOutput as string | undefined,
      videoResolution: argv.videoResolution as "720p" | "1080p" | undefined,
      videoLength: argv.videoLength as 4 | 6 | 8 | undefined,
      videoAspectRatio: argv.videoAspectRatio as "9:16" | "16:9" | undefined,
      videoAudio: argv.videoAudio as boolean | undefined,
      // PPT generation options
      pptPages: argv.pptPages as number | undefined,
      pptTheme: argv.pptTheme as
        | "modern"
        | "corporate"
        | "creative"
        | "minimal"
        | "dark"
        | undefined,
      pptAudience: argv.pptAudience as
        | "business"
        | "students"
        | "technical"
        | "general"
        | undefined,
      pptTone: argv.pptTone as
        | "professional"
        | "casual"
        | "educational"
        | "persuasive"
        | undefined,
      pptOutput: argv.pptOutput as string | undefined,
      pptAspectRatio: argv.pptAspectRatio as "16:9" | "4:3" | undefined,
      pptNoImages: argv.pptNoImages as boolean | undefined,
      // Extended thinking options for Claude and Gemini models
      thinking: argv.thinking as boolean | undefined,
      thinkingBudget: argv.thinkingBudget as number | undefined,
      thinkingLevel: argv.thinkingLevel as
        | "minimal"
        | "low"
        | "medium"
        | "high"
        | undefined,
      // Region option for cloud providers (Vertex AI, Bedrock, etc.)
      region: argv.region as string | undefined,
      // Anthropic subscription options
      authMethod: argv.authMethod as "api-key" | "oauth" | undefined,
      subscriptionTier: argv.subscriptionTier as
        | "free"
        | "pro"
        | "max"
        | "max_5"
        | "max_20"
        | "api"
        | undefined,
      enableBeta: argv.enableBeta as boolean | undefined,
    };
  }

  /**
   * Validate Anthropic subscription options
   * Ensures subscription tier is provided when using anthropic-subscription provider
   * or when oauth auth method is selected
   */
  private static validateAnthropicSubscriptionOptions(
    options: Record<string, unknown>,
  ): void {
    const provider = options.provider as string | undefined;
    const authMethod = options.authMethod as string | undefined;
    let subscriptionTier = options.subscriptionTier as string | undefined;
    const enableBeta = options.enableBeta as boolean | undefined;

    // Check if using anthropic-subscription provider or oauth auth method
    const isSubscriptionMode =
      provider === "anthropic-subscription" || authMethod === "oauth";

    if (isSubscriptionMode && !subscriptionTier) {
      logger.always(
        chalk.yellow(
          "⚠️  Subscription tier not specified. Defaulting to 'api' tier.",
        ),
      );
      logger.always(
        chalk.gray(
          "   Use --subscription-tier to specify: free, pro, max, or api",
        ),
      );
      options.subscriptionTier = "api";
      subscriptionTier = "api";
    }

    // Validate oauth is required for non-api subscription tiers
    if (
      subscriptionTier &&
      ["free", "pro", "max"].includes(subscriptionTier) &&
      authMethod !== "oauth"
    ) {
      logger.always(
        chalk.yellow(
          `⚠️  Subscription tier '${subscriptionTier}' typically uses OAuth authentication.`,
        ),
      );
      logger.always(
        chalk.gray("   Consider using --auth-method oauth for this tier."),
      );
    }

    // Map anthropic-subscription to anthropic provider with subscription options
    if (provider === "anthropic-subscription") {
      options.provider = "anthropic";
      options.useSubscription = true;
    }

    // Warn about beta features when enabled
    if (enableBeta) {
      logger.always(
        chalk.cyan(
          "🧪 Beta features enabled for Anthropic. Experimental capabilities may be unstable.",
        ),
      );
    }

    // Build Anthropic auth configuration for provider initialization
    if (provider === "anthropic" || provider === "anthropic-subscription") {
      const authConfig: AnthropicAuthConfig = {
        method: (authMethod === "oauth"
          ? "oauth"
          : "api_key") as AnthropicAuthMethod,
        subscriptionTier: subscriptionTier as
          | ClaudeSubscriptionTier
          | undefined,
      };
      options.anthropicAuthConfig = authConfig;
      options.enableBeta = enableBeta;
    }
  }

  // Helper method to handle output
  private static handleOutput(
    result: CliGenerateResult | unknown,
    options: BaseCommandArgs & Record<string, unknown>,
  ) {
    let output: string;

    if (options.format === "json") {
      output = JSON.stringify(result, null, 2);
    } else if (options.format === "table" && Array.isArray(result)) {
      logger.table(result);
      return;
    } else {
      if (typeof result === "string") {
        output = result;
      } else if (result && typeof result === "object" && "content" in result) {
        const generateResult = result as CliGenerateResult;
        output = generateResult.content;

        // 🔧 Handle image generation output
        if (
          generateResult.imageOutput?.base64 &&
          generateResult.imageOutput.base64.trim().length > 0
        ) {
          try {
            // Use custom path or default
            let imagePath: string;
            if (options.imageOutput) {
              imagePath = path.resolve(options.imageOutput as string);
              // Create parent directory if needed (cross-platform)
              const dir = path.dirname(imagePath);
              if (dir && dir !== "." && !fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
            } else {
              const imageDir = "generated-images";
              const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
              imagePath = path.join(imageDir, `image-${timestamp}.png`);
              // Create directory if it doesn't exist
              if (!fs.existsSync(imageDir)) {
                fs.mkdirSync(imageDir, { recursive: true });
              }
            }

            // Save image to file
            const imageBuffer = Buffer.from(
              generateResult.imageOutput.base64,
              "base64",
            );
            fs.writeFileSync(imagePath, imageBuffer);

            // Store image path in result for JSON output
            generateResult.imageOutput.savedPath = imagePath;

            // Always print image save confirmation - this is essential output
            // (not suppressed by quiet flag since users need to know where the image was saved)
            logger.always(`\n📸 Generated image saved to: ${imagePath}`);
            logger.always(
              `   Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`,
            );
          } catch (error) {
            handleError(error as Error, "Failed to save generated image");
          }
        }

        // Add analytics display for text mode when enabled
        if (options.enableAnalytics && generateResult.analytics) {
          output +=
            CLICommandFactory.formatAnalyticsForTextMode(generateResult);
        }
      } else if (result && typeof result === "object" && "text" in result) {
        output = (result as { text: string }).text;
      } else {
        output = JSON.stringify(result);
      }
    }

    if (options.output) {
      fs.writeFileSync(options.output as string, output);
      if (!options.quiet) {
        logger.always(`Output saved to ${options.output}`);
      }
    } else {
      logger.always(output);
    }
  }

  /**
   * Helper method to handle TTS audio file output
   * Saves audio to file when --tts-output flag is provided
   */
  private static async handleTTSOutput(
    result: CliGenerateResult | unknown,
    options: BaseCommandArgs & Record<string, unknown>,
  ): Promise<void> {
    // Check if --tts-output flag is provided
    const ttsOutputPath = options.ttsOutput as string | undefined;
    if (!ttsOutputPath) {
      return;
    }

    // Extract audio from result with proper type checking
    if (!result || typeof result !== "object") {
      return;
    }
    const generateResult = result as CliGenerateResult;
    const audio = generateResult.audio;

    if (!audio) {
      if (!options.quiet) {
        logger.always(
          chalk.yellow(
            "⚠️  No audio available in result. TTS may not be enabled for this request.",
          ),
        );
      }
      return;
    }

    try {
      // Save audio to file
      const saveResult = await saveAudioToFile(audio, ttsOutputPath);

      if (saveResult.success) {
        if (!options.quiet) {
          logger.always(
            chalk.green(
              `🔊 Audio saved to: ${saveResult.path} (${formatFileSize(saveResult.size)})`,
            ),
          );
        }
      } else {
        handleError(
          new Error(saveResult.error || "Failed to save audio file"),
          "TTS Output",
        );
      }
    } catch (error) {
      handleError(error as Error, "TTS Output");
    }
  }

  /**
   * Helper method to configure options for video generation mode
   * Auto-configures provider, model, and tools settings for video generation
   */
  private static configureVideoMode(
    enhancedOptions: BaseCommandArgs & Record<string, unknown>,
    argv: BaseCommandArgs & Record<string, unknown>,
    options: BaseCommandArgs & Record<string, unknown>,
  ): void {
    const userEnabledTools = !argv.disableTools; // Tools are enabled by default
    enhancedOptions.disableTools = true;

    // Auto-set provider to vertex for video generation if not explicitly specified
    if (!enhancedOptions.provider) {
      enhancedOptions.provider = "vertex";
      if (options.debug) {
        logger.debug(
          "Auto-setting provider to 'vertex' for video generation mode",
        );
      }
    } else if (enhancedOptions.provider !== "vertex") {
      // Warn if user specified a non-vertex provider
      if (!options.quiet) {
        logger.always(
          chalk.yellow(
            `⚠️  Warning: Video generation only supports Vertex AI. Overriding provider '${enhancedOptions.provider}' to 'vertex'.`,
          ),
        );
      }
      enhancedOptions.provider = "vertex";
    }

    // Auto-set model to veo-3.1 if not explicitly specified
    if (!enhancedOptions.model) {
      // Resolve the alias to the full model ID for Vertex AI
      const modelAlias = "veo-3.1";
      const resolvedModel = ModelResolver.resolveModel(modelAlias);
      const fullModelId = resolvedModel?.id || "veo-3.1-generate-001";
      enhancedOptions.model = fullModelId;
      if (options.debug) {
        logger.debug(
          `Auto-setting model to '${fullModelId}' for video generation mode`,
        );
      }
    }

    // Warn user if they explicitly enabled tools
    if (userEnabledTools && !options.quiet) {
      logger.always(
        chalk.yellow(
          "⚠️  Note: MCP tools are not supported in video generation mode and have been disabled.",
        ),
      );
    }

    if (options.debug) {
      logger.debug("Video generation mode enabled (tools auto-disabled):", {
        provider: enhancedOptions.provider,
        model: enhancedOptions.model,
        resolution: enhancedOptions.videoResolution,
        length: enhancedOptions.videoLength,
        aspectRatio: enhancedOptions.videoAspectRatio,
        audio: enhancedOptions.videoAudio,
        outputPath: enhancedOptions.videoOutput,
      });
    }
  }

  /**
   * Helper method to configure options for PPT generation mode
   * Auto-configures provider, model, and tools settings for presentation generation
   */
  private static configurePPTMode(
    enhancedOptions: BaseCommandArgs & Record<string, unknown>,
    argv: BaseCommandArgs & Record<string, unknown>,
    options: BaseCommandArgs & Record<string, unknown>,
  ): void {
    const userEnabledTools = !argv.disableTools; // Tools are enabled by default
    enhancedOptions.disableTools = true;

    // Auto-set provider for PPT generation if not explicitly specified
    // PPT works best with Vertex or Google AI for content planning
    if (!enhancedOptions.provider) {
      enhancedOptions.provider = "vertex";
      if (options.debug) {
        logger.debug(
          "Auto-setting provider to 'vertex' for PPT generation mode",
        );
      }
    }

    // Auto-set model if not explicitly specified
    if (!enhancedOptions.model) {
      // Use gemini-2.5-flash for fast, high-quality content planning
      const modelAlias = "gemini-2.5-flash";
      const resolvedModel = ModelResolver.resolveModel(modelAlias);
      const fullModelId = resolvedModel?.id || "gemini-2.5-flash-001";
      enhancedOptions.model = fullModelId;
      if (options.debug) {
        logger.debug(
          `Auto-setting model to '${fullModelId}' for PPT generation mode`,
        );
      }
    }

    // Warn user if they explicitly enabled tools
    if (userEnabledTools && !options.quiet) {
      logger.always(
        chalk.yellow(
          "⚠️  Note: MCP tools are not supported in PPT generation mode and have been disabled.",
        ),
      );
    }

    if (options.debug) {
      logger.debug("PPT generation mode enabled (tools auto-disabled):", {
        provider: enhancedOptions.provider,
        model: enhancedOptions.model,
        pages: enhancedOptions.pptPages,
        theme: enhancedOptions.pptTheme,
        audience: enhancedOptions.pptAudience,
        tone: enhancedOptions.pptTone,
        aspectRatio: enhancedOptions.pptAspectRatio,
        noImages: enhancedOptions.pptNoImages,
        outputPath: enhancedOptions.pptOutput,
      });
    }
  }

  /**
   * Helper method to handle video file output
   * Saves generated video to file when --videoOutput flag is provided
   */
  private static async handleVideoOutput(
    result: CliGenerateResult | unknown,
    options: BaseCommandArgs & Record<string, unknown>,
  ): Promise<void> {
    // Check if --videoOutput flag is provided
    const videoOutputPath = options.videoOutput as string | undefined;
    if (!videoOutputPath) {
      return;
    }

    // Extract video from result with proper type checking
    if (!result || typeof result !== "object") {
      return;
    }
    const generateResult = result as CliGenerateResult;
    const video = generateResult.video;

    if (!video) {
      if (!options.quiet) {
        logger.always(
          chalk.yellow(
            "⚠️  No video available in result. Video generation may not be enabled or the request failed.",
          ),
        );
      }
      return;
    }

    try {
      // Save video to file
      const saveResult = await saveVideoToFile(video, videoOutputPath);

      if (saveResult.success) {
        const sizeInfo = formatVideoFileSize(saveResult.size);
        const metadataSummary = getVideoMetadataSummary(video);

        logger.always(
          chalk.green(`🎬 Video saved to: ${saveResult.path} (${sizeInfo})`),
        );

        if (!options.quiet && metadataSummary) {
          logger.always(chalk.gray(`   ${metadataSummary}`));
        }
      } else {
        handleError(
          new Error(saveResult.error || "Failed to save video file"),
          "Video Output",
        );
      }
    } catch (error) {
      handleError(error as Error, "Video Output");
    }
  }

  /**
   * Helper method to handle PPT file output
   * Displays PPT generation result info
   */
  private static async handlePPTOutput(
    result: CliGenerateResult | unknown,
    options: BaseCommandArgs & Record<string, unknown>,
  ): Promise<void> {
    // Extract PPT from result with proper type checking
    if (!result || typeof result !== "object") {
      return;
    }
    const generateResult = result as CliGenerateResult;
    const ppt = generateResult.ppt;

    if (!ppt) {
      // PPT not in result - either not PPT mode or generation failed
      return;
    }

    try {
      if (options.quiet) {
        if (ppt.filePath) {
          logger.always(
            chalk.green(`📊 Presentation saved to: ${ppt.filePath}`),
          );
        } else {
          logger.always(chalk.green("📊 Presentation generated successfully."));
        }
        if (ppt.totalSlides) {
          logger.always(chalk.white(`📄 Slides: ${ppt.totalSlides}`));
        }
        return;
      }

      logger.always(chalk.green("\n📊 Presentation Generated Successfully!"));
      logger.always(chalk.gray("─".repeat(50)));

      if (ppt.filePath) {
        logger.always(chalk.white(`   📁 File: ${ppt.filePath}`));
      }
      if (ppt.totalSlides) {
        logger.always(chalk.white(`   📄 Slides: ${ppt.totalSlides}`));
      }
      if (ppt.format) {
        logger.always(chalk.white(`   📋 Format: ${ppt.format.toUpperCase()}`));
      }

      logger.always(chalk.gray("─".repeat(50)));
      logger.always(
        chalk.cyan(
          "💡 Tip: Open the file with PowerPoint or Google Slides to view.",
        ),
      );
    } catch (error) {
      handleError(error as Error, "PPT Output");
    }
  }

  // Helper method to validate token usage data with fallback handling
  private static isValidTokenUsage(tokens: unknown): tokens is TokenUsage {
    if (!tokens || typeof tokens !== "object" || tokens === null) {
      return false;
    }

    const tokensObj = tokens as unknown as Record<string, unknown>;

    // Check primary format: analytics.tokens {input, output, total}
    if (
      typeof tokensObj.input === "number" &&
      typeof tokensObj.output === "number" &&
      typeof tokensObj.total === "number"
    ) {
      return true;
    }

    // Check fallback format: tokenUsage {inputTokens, outputTokens, totalTokens}
    if (
      typeof tokensObj.inputTokens === "number" &&
      typeof tokensObj.outputTokens === "number" &&
      typeof tokensObj.totalTokens === "number"
    ) {
      return true;
    }

    return false;
  }

  // Helper method to normalize token usage data to standard format
  private static normalizeTokenUsage(tokens: unknown): TokenUsage | null {
    if (!CLICommandFactory.isValidTokenUsage(tokens)) {
      return null;
    }

    const tokensObj = tokens as unknown as Record<string, unknown>;

    // Primary format: analytics.tokens {input, output, total}
    if (
      typeof tokensObj.input === "number" &&
      typeof tokensObj.output === "number" &&
      typeof tokensObj.total === "number"
    ) {
      return {
        input: tokensObj.input,
        output: tokensObj.output,
        total: tokensObj.total,
      };
    }

    // Fallback format: tokenUsage {inputTokens, outputTokens, totalTokens}
    if (
      typeof tokensObj.inputTokens === "number" &&
      typeof tokensObj.outputTokens === "number" &&
      typeof tokensObj.totalTokens === "number"
    ) {
      return {
        input: tokensObj.inputTokens,
        output: tokensObj.outputTokens,
        total: tokensObj.totalTokens,
      };
    }

    return null;
  }

  // Helper method to format analytics for text mode display
  private static formatAnalyticsForTextMode(result: CliGenerateResult): string {
    if (!result.analytics) {
      return "";
    }

    const analytics = result.analytics;
    let analyticsText = "\n\n📊 Analytics:\n";

    // Provider and model info
    analyticsText += `   Provider: ${analytics.provider}`;
    // Check for model in multiple locations: result.model, analytics.model, or available model property
    const modelName =
      result.model ||
      analytics.model ||
      (analytics as { modelName?: string }).modelName;
    if (modelName) {
      analyticsText += ` (${modelName})`;
    }
    analyticsText += "\n";

    // Token usage with fallback handling
    const normalizedTokens = CLICommandFactory.normalizeTokenUsage(
      analytics.tokenUsage,
    );
    if (normalizedTokens) {
      analyticsText += `   Tokens: ${normalizedTokens.input} input + ${normalizedTokens.output} output = ${normalizedTokens.total} total\n`;
    }

    // Cost information
    if (
      analytics.cost !== undefined &&
      analytics.cost !== null &&
      typeof analytics.cost === "number"
    ) {
      analyticsText += `   Cost: $${analytics.cost.toFixed(5)}\n`;
    }

    // Response time with fallback handling for requestDuration vs responseTime
    const duration =
      analytics.requestDuration ||
      (analytics as unknown as Record<string, unknown>).responseTime ||
      (analytics as unknown as Record<string, unknown>).duration;
    if (duration && typeof duration === "number") {
      const timeInSeconds = (duration / 1000).toFixed(1);
      analyticsText += `   Time: ${timeInSeconds}s\n`;
    }

    // Tools used
    if (result.toolsUsed && result.toolsUsed.length > 0) {
      analyticsText += `   Tools: ${result.toolsUsed.join(", ")}\n`;
    }

    // Context information
    if (
      analytics.context &&
      typeof analytics.context === "object" &&
      analytics.context !== null
    ) {
      const contextEntries = Object.entries(analytics.context);
      if (contextEntries.length > 0) {
        const contextItems = contextEntries.map(
          ([key, value]) => `${key}=${value}`,
        );
        analyticsText += `   Context: ${contextItems.join(", ")}\n`;
      }
    }

    return analyticsText;
  }

  /**
   * Create the new primary 'generate' command
   */
  static createGenerateCommand(): CommandModule {
    return {
      command: ["generate <input>", "gen <input>"],
      describe: "Generate content using AI providers",
      builder: (yargs) => {
        return CLICommandFactory.buildOptions(
          yargs
            .positional("input", {
              type: "string" as const,
              description: "Text prompt for AI generation (or read from stdin)",
            })
            .example(
              '$0 generate "Explain quantum computing"',
              "Basic generation",
            )
            .example(
              '$0 gen "Write a Python function" --provider openai',
              "Use specific provider",
            )
            .example(
              '$0 generate "Code review" -m gpt-4 -t 0.3',
              "Use specific model and temperature",
            )
            .example('echo "Summarize this" | $0 generate', "Use stdin input")
            .example(
              '$0 generate "Analyze data" --enable-analytics',
              "Enable usage analytics",
            )
            .example(
              '$0 generate "Futuristic city" --model gemini-2.5-flash-image',
              "Generate an image",
            )
            .example(
              '$0 generate "Mountain landscape" --model gemini-2.5-flash-image --imageOutput ./my-images/mountain.png',
              "Generate image with custom path",
            )
            .example(
              '$0 generate "Describe this video" --video path/to/video.mp4',
              "Analyze video content",
            )
            .example(
              '$0 generate "Analyze sales" --csv data.csv --csv-format raw',
              "CSV with raw format (fast, minimal tokens)",
            )
            .example(
              '$0 generate "Summarize data" --csv small.csv --csv-format markdown',
              "CSV with markdown table (readable)",
            )
            .example(
              '$0 generate "Process data" --csv records.csv --csv-format json',
              "CSV with JSON format (structured)",
            )
            .example(
              '$0 generate "Product showcase video" --image ./product.jpg --outputMode video --videoOutput ./output.mp4',
              "Generate video from image",
            )
            .example(
              '$0 generate "Smooth camera movement" --image ./input.jpg --provider vertex --model veo-3.1-generate-001 --outputMode video --videoResolution 720p --videoLength 6 --videoAspectRatio 16:9 --videoOutput ./output.mp4',
              "Video generation with full options",
            )
            .example(
              '$0 generate "AI in Healthcare" --pptPages 10',
              "Generate a PowerPoint presentation",
            )
            .example(
              '$0 generate "Company Q4 Results" --pptPages 15 --pptTheme corporate --pptAudience business',
              "Generate presentation with options",
            )
            .example(
              '$0 generate "Machine Learning 101" --pptTheme minimal --pptTone educational --pptNoImages',
              "Generate educational slides without AI images",
            ),
        );
      },
      handler: async (argv) =>
        await CLICommandFactory.executeGenerate(argv as GenerateCommandArgs),
    };
  }

  /**
   * Create stream command
   */
  static createStreamCommand(): CommandModule {
    return {
      command: "stream <input>",
      describe: "Stream generation in real-time",
      builder: (yargs) => {
        return CLICommandFactory.buildOptions(
          yargs
            .positional("input", {
              type: "string" as const,
              description: "Text prompt for streaming (or read from stdin)",
            })
            .example(
              '$0 stream "Write a story about space"',
              "Stream a creative story",
            )
            .example(
              '$0 stream "Explain machine learning" -p anthropic',
              "Stream with specific provider",
            )
            .example(
              '$0 stream "Code walkthrough" --output story.txt',
              "Stream to file",
            )
            .example('echo "Live demo" | $0 stream', "Stream from stdin")
            .example(
              '$0 stream "Narrate this video" --video path/to/video.mp4',
              "Stream video analysis",
            ),
        );
      },
      handler: async (argv) =>
        await CLICommandFactory.executeStream(argv as StreamCommandArgs),
    };
  }

  /**
   * Create batch command
   */
  static createBatchCommand(): CommandModule {
    return {
      command: "batch <file>",
      describe: "Process multiple prompts from a file",
      builder: (yargs) => {
        return CLICommandFactory.buildOptions(
          yargs
            .positional("file", {
              type: "string" as const,
              description: "File with prompts (one per line)",
              demandOption: true,
            })
            .example("$0 batch prompts.txt", "Process prompts from file")
            .example(
              "$0 batch questions.txt --format json",
              "Export results as JSON",
            )
            .example(
              "$0 batch tasks.txt -p vertex --delay 2000",
              "Use Vertex AI with 2s delay",
            )
            .example(
              "$0 batch batch.txt --output results.json",
              "Save results to file",
            ),
        );
      },
      handler: async (argv) =>
        await CLICommandFactory.executeBatch(argv as BatchCommandArgs),
    };
  }

  /**
   * Create provider commands
   */
  static createProviderCommands(): CommandModule {
    return {
      command: "provider <subcommand>",
      describe: "Manage AI provider configurations and status",
      builder: (yargs) => {
        return yargs
          .command(
            "status",
            "Check status of all configured AI providers",
            (y) =>
              CLICommandFactory.buildOptions(y)
                .example("$0 provider status", "Check all provider status")
                .example(
                  "$0 provider status --verbose",
                  "Detailed provider diagnostics",
                )
                .example("$0 provider status --quiet", "Minimal status output"),
            (argv) =>
              CLICommandFactory.executeProviderStatus(argv as BaseCommandArgs),
          )
          .demandCommand(1, "Please specify a provider subcommand");
      },
      handler: () => {}, // No-op handler as subcommands handle everything
    };
  }

  /**
   * Create status command (alias for provider status)
   */
  static createStatusCommand(): CommandModule {
    return {
      command: "status",
      describe:
        "Check AI provider connectivity and performance (alias for provider status)",
      builder: (yargs) =>
        CLICommandFactory.buildOptions(yargs)
          .example("$0 status", "Quick provider status check")
          .example("$0 status --verbose", "Detailed connectivity diagnostics")
          .example("$0 status --format json", "Export status as JSON"),
      handler: async (argv) =>
        await CLICommandFactory.executeProviderStatus(argv as BaseCommandArgs),
    };
  }

  /**
   * Create models commands
   */
  static createModelsCommands(): CommandModule {
    return ModelsCommandFactory.createModelsCommands();
  }

  /**
   * Create MCP commands
   */
  static createMCPCommands(): CommandModule {
    return MCPCommandFactory.createMCPCommands();
  }

  /**
   * Create discover command
   */
  static createDiscoverCommand(): CommandModule {
    return MCPCommandFactory.createDiscoverCommand();
  }

  /**
   * Create memory commands
   */
  static createMemoryCommands(): CommandModule {
    return {
      command: "memory <subcommand>",
      describe: "Manage conversation memory",
      builder: (yargs) => {
        return yargs
          .command(
            "stats",
            "Show conversation memory statistics",
            (y) =>
              CLICommandFactory.buildOptions(y)
                .example("$0 memory stats", "Show memory usage statistics")
                .example(
                  "$0 memory stats --format json",
                  "Export stats as JSON",
                ),
            async (argv) =>
              await CLICommandFactory.executeMemoryStats(
                argv as BaseCommandArgs,
              ),
          )
          .command(
            "history <sessionId>",
            "Show conversation history for a session",
            (y) =>
              CLICommandFactory.buildOptions(y)
                .positional("sessionId", {
                  type: "string" as const,
                  description: "Session ID to retrieve history for",
                  demandOption: true,
                })
                .example(
                  "$0 memory history session-123",
                  "Show conversation history",
                )
                .example(
                  "$0 memory history session-123 --format json",
                  "Export history as JSON",
                ),
            async (argv) =>
              await CLICommandFactory.executeMemoryHistory(
                argv as BaseCommandArgs & { sessionId: string },
              ),
          )
          .command(
            "clear [sessionId]",
            "Clear conversation history",
            (y) =>
              CLICommandFactory.buildOptions(y)
                .positional("sessionId", {
                  type: "string" as const,
                  description:
                    "Session ID to clear (omit to clear all sessions)",
                  demandOption: false,
                })
                .example("$0 memory clear", "Clear all conversation history")
                .example(
                  "$0 memory clear session-123",
                  "Clear specific session",
                ),
            async (argv) =>
              await CLICommandFactory.executeMemoryClear(
                argv as BaseCommandArgs & { sessionId?: string },
              ),
          )
          .demandCommand(1, "Please specify a memory subcommand");
      },
      handler: () => {}, // No-op handler as subcommands handle everything
    };
  }

  /**
   * Create config commands
   */
  static createConfigCommands(): CommandModule {
    return {
      command: "config <subcommand>",
      describe: "Manage NeuroLink configuration",
      builder: (yargs) => {
        return yargs
          .command(
            "init",
            "Interactive configuration setup wizard",
            (y) => CLICommandFactory.buildOptions(y),
            async (_argv) => {
              await configManager.initInteractive();
            },
          )
          .command(
            "show",
            "Display current configuration",
            (y) => CLICommandFactory.buildOptions(y),
            async (_argv) => {
              configManager.showConfig();
            },
          )
          .command(
            "validate",
            "Validate current configuration",
            (y) => CLICommandFactory.buildOptions(y),
            async (_argv) => {
              const result = configManager.validateConfig();
              if (result.valid) {
                logger.always(chalk.green("✅ Configuration is valid"));
              } else {
                const errorMessages = result.errors.join("\n  • ");
                handleError(
                  new Error(`Configuration has errors:\n  • ${errorMessages}`),
                  "Configuration validation",
                );
              }
            },
          )
          .command(
            "reset",
            "Reset configuration to defaults",
            (y) => CLICommandFactory.buildOptions(y),
            async (_argv) => {
              configManager.resetConfig();
            },
          )
          .command(
            "export",
            "Export current configuration",
            (y) => CLICommandFactory.buildOptions(y),
            (argv) =>
              CLICommandFactory.executeConfigExport(argv as BaseCommandArgs),
          )
          .demandCommand(1, "");
      },
      handler: () => {}, // No-op handler as subcommands handle everything
    };
  }

  /**
   * Create validate command
   */
  static createValidateCommand(): CommandModule {
    return {
      command: "validate",
      describe: "Validate current configuration (alias for 'config validate')",
      builder: (yargs) => CLICommandFactory.buildOptions(yargs),
      handler: async (_argv) => {
        const result = configManager.validateConfig();
        if (result.valid) {
          logger.always(chalk.green("✅ Configuration is valid"));
        } else {
          const errorMessages = result.errors.join("\n  • ");
          handleError(
            new Error(`Configuration has errors:\n  • ${errorMessages}`),
            "Configuration validation",
          );
        }
      },
    };
  }

  /**
   * Create get-best-provider command
   */
  static createBestProviderCommand(): CommandModule {
    return {
      command: "get-best-provider",
      describe: "Show the best available AI provider",
      builder: (yargs) =>
        CLICommandFactory.buildOptions(yargs)
          .example("$0 get-best-provider", "Get best available provider")
          .example("$0 get-best-provider --format json", "Get provider as JSON")
          .example("$0 get-best-provider --quiet", "Just the provider name"),
      handler: async (argv) =>
        await CLICommandFactory.executeGetBestProvider(argv as BaseCommandArgs),
    };
  }

  /**
   * Create Ollama commands
   */
  static createOllamaCommands(): CommandModule {
    return OllamaCommandFactory.createOllamaCommands();
  }

  /**
   * Create setup command
   */
  static createSetupCommand(): CommandModule {
    return {
      command: ["setup [provider]", "s [provider]"],
      describe: "Interactive AI provider setup wizard",
      builder: (yargs) => {
        return CLICommandFactory.buildOptions(
          yargs
            .positional("provider", {
              type: "string" as const,
              description: "Specific provider to set up",
              choices: [
                "google-ai",
                "openai",
                "openrouter",
                "anthropic",
                "anthropic-subscription", // Setup Anthropic with subscription tier
                "azure",
                "bedrock",
                "vertex",
                "huggingface",
                "mistral",
              ],
            })
            .option("list", {
              type: "boolean" as const,
              description: "List all available providers",
              alias: "l",
            })
            .option("status", {
              type: "boolean" as const,
              description: "Show provider configuration status",
            })
            .option("subscription-tier", {
              type: "string" as const,
              choices: ["free", "pro", "max", "max_5", "max_20", "api"],
              description:
                "Anthropic subscription tier for setup (free, pro, max, max_5, max_20, api)",
            })
            .option("auth-method", {
              type: "string" as const,
              choices: ["api-key", "oauth"],
              description:
                "Authentication method for Anthropic (api-key or oauth)",
            })
            .example("$0 setup", "Interactive setup wizard")
            .example("$0 setup --provider openai", "Setup specific provider")
            .example(
              "$0 setup --provider anthropic --subscription-tier pro",
              "Setup Anthropic with Pro subscription",
            )
            .example(
              "$0 setup --provider anthropic --auth-method oauth",
              "Setup Anthropic with OAuth authentication",
            )
            .example("$0 setup --list", "List all providers")
            .example("$0 setup --status", "Check provider status"),
        );
      },
      handler: async (argv) =>
        await handleSetup(
          argv as BaseCommandArgs & {
            provider?: string;
            list?: boolean;
            status?: boolean;
            subscriptionTier?:
              | "free"
              | "pro"
              | "max"
              | "max_5"
              | "max_20"
              | "api";
            authMethod?: "api-key" | "oauth";
          },
        ),
    };
  }

  /**
   * Create SageMaker commands
   */
  static createSageMakerCommands(): CommandModule {
    return SageMakerCommandFactory.createSageMakerCommands();
  }

  /**
   * Create completion command
   */
  /**
   * Create loop command
   */
  static createLoopCommand(): CommandModule {
    return {
      command: "loop",
      describe:
        "Start an interactive loop session with conversation management",
      builder: (yargs) =>
        CLICommandFactory.buildOptions(yargs, {
          "enable-conversation-memory": {
            type: "boolean",
            description: "Enable conversation memory for the loop session",
            default: true,
          },
          "max-sessions": {
            type: "number",
            description: "Maximum number of conversation sessions to keep",
            default: 50,
          },
          "max-turns-per-session": {
            type: "number",
            description: "Maximum turns per conversation session",
            default: 20,
          },
          "auto-redis": {
            type: "boolean",
            description: "Automatically use Redis if available",
            default: true,
          },
          resume: {
            type: "string",
            description:
              "Directly resume a specific conversation by session ID",
            alias: "r",
          },
          new: {
            type: "boolean",
            description: "Force start a new conversation (skip selection menu)",
            alias: "n",
          },
          "list-conversations": {
            type: "boolean",
            description: "List available conversations and exit",
            alias: "l",
          },
          "compact-threshold": {
            describe: "Context compaction trigger threshold (0.0-1.0)",
            type: "number",
            default: 0.8,
          },
          "disable-compaction": {
            describe: "Disable automatic context compaction",
            type: "boolean",
            default: false,
          },
        })
          .example(
            "$0 loop",
            "Start interactive session with conversation selection",
          )
          .example("$0 loop --new", "Force start new conversation")
          .example("$0 loop --resume abc123", "Resume specific conversation")
          .example(
            "$0 loop --list-conversations",
            "List available conversations",
          )
          .example("$0 loop --no-auto-redis", "Use in-memory storage only")
          .example(
            "$0 loop --enable-conversation-memory",
            "Start loop with memory",
          ),
      handler: async (argv) => {
        if (globalSession.getCurrentSessionId()) {
          logger.error(
            "A loop session is already active. Cannot start a new one.",
          );
          return;
        }

        let conversationMemoryConfig: ConversationMemoryConfig | undefined;

        const {
          enableConversationMemory,
          maxSessions,
          maxTurnsPerSession,
          autoRedis,
          listConversations,
          compactThreshold,
          disableCompaction,
        } = argv;

        if (enableConversationMemory) {
          let storageType = "memory";

          if (autoRedis) {
            const isRedisAvailable = await checkRedisAvailability();
            if (isRedisAvailable) {
              storageType = "redis";
              if (!argv.quiet) {
                logger.always(
                  chalk.green(
                    "✅ Using Redis for persistent conversation memory",
                  ),
                );
              }
            } else if (argv.debug) {
              logger.debug("Redis not available, using in-memory storage");
            }
          } else if (argv.debug) {
            logger.debug("Auto-Redis disabled, using in-memory storage");
          }

          process.env.STORAGE_TYPE = storageType;

          conversationMemoryConfig = {
            enabled: true,
            maxSessions: maxSessions as number,
            maxTurnsPerSession: maxTurnsPerSession as number,
            contextCompaction: {
              enabled: !disableCompaction,
              threshold: compactThreshold as number,
            },
          };
        }

        // Handle --list-conversations option
        if (listConversations) {
          const { ConversationSelector } =
            await import("../loop/conversationSelector.js");
          const conversationSelector = new ConversationSelector();

          try {
            const hasConversations =
              await conversationSelector.hasStoredConversations();
            if (!hasConversations) {
              logger.always(chalk.yellow("📝 No stored conversations found"));
              return;
            }

            const conversations =
              await conversationSelector.getAvailableConversations();
            logger.always(chalk.blue("📋 Available Conversations:"));

            conversations.forEach(
              (conv: ConversationSummary, index: number) => {
                const sessionId = conv.sessionId.slice(0, 12) + "...";
                const title = conv.title || "Untitled Conversation";
                const messageCount = conv.messageCount || 0;
                const lastActivity = conv.updatedAt
                  ? new Date(conv.updatedAt).toLocaleDateString()
                  : "Unknown";

                logger.always(
                  `${index + 1}. ${chalk.cyan(sessionId)} - ${title}`,
                );
                logger.always(
                  `   ${chalk.gray(`${messageCount} messages | Last: ${lastActivity}`)}`,
                );
              },
            );

            logger.always(
              chalk.gray(
                `\nUse: neurolink loop --resume <session-id> to resume a conversation`,
              ),
            );
          } catch (error) {
            logger.error("Failed to list conversations:", error);
          } finally {
            await conversationSelector.close();
          }
          return;
        }

        // Create enhanced session with direct session management options
        const sessionOptions: {
          directResumeSessionId?: string;
          forceNewSession?: boolean;
        } = {};

        // Pass CLI options to session for direct session management
        if (argv.resume && typeof argv.resume === "string") {
          sessionOptions.directResumeSessionId = argv.resume;
        }

        if (argv.new) {
          sessionOptions.forceNewSession = true;
        }

        const session = new LoopSession(
          initializeCliParser,
          conversationMemoryConfig,
          sessionOptions,
        );

        await session.start();
      },
    };
  }

  /**
   * Create completion command
   */
  static createCompletionCommand(): CommandModule {
    return {
      command: "completion",
      describe: "Generate shell completion script",
      builder: (yargs) =>
        CLICommandFactory.buildOptions(yargs)
          .example("$0 completion", "Generate shell completion")
          .example(
            "$0 completion > ~/.neurolink-completion.sh",
            "Save completion script",
          )
          .example(
            "source ~/.neurolink-completion.sh",
            "Enable completions (bash)",
          )
          .epilogue(
            "Add the completion script to your shell profile for persistent completions",
          ),
      handler: async (argv) =>
        await CLICommandFactory.executeCompletion(argv as BaseCommandArgs),
    };
  }

  /**
   * Execute provider status command
   */
  private static async executeProviderStatus(argv: BaseCommandArgs) {
    if (argv.verbose && !argv.quiet) {
      logger.always(
        chalk.yellow("ℹ️ Verbose mode enabled. Displaying detailed status.\n"),
      );
    }
    const spinner = argv.quiet
      ? null
      : ora("🔍 Checking AI provider status...\n").start();
    const sdk = globalSession.getOrCreateNeuroLink();

    try {
      // Handle dry-run mode for provider status
      if (argv.dryRun) {
        const mockResults = [
          {
            provider: "google-ai",
            status: "working",
            configured: true,
            requestDuration: 150,
            model: "gemini-2.5-flash",
          },
          {
            provider: "openai",
            status: "working",
            configured: true,
            requestDuration: 200,
            model: "gpt-4o-mini",
          },
          {
            provider: "anthropic",
            status: "working",
            configured: true,
            requestDuration: 180,
            model: "claude-3-haiku",
          },
          { provider: "bedrock", status: "not configured", configured: false },
          { provider: "vertex", status: "not configured", configured: false },
        ];

        if (spinner) {
          spinner.succeed(
            "Provider check complete (dry-run): 3/3 providers working",
          );
        }

        // Display mock results
        for (const result of mockResults) {
          const status =
            result.status === "working"
              ? chalk.green("✅ Working")
              : result.status === "failed"
                ? chalk.red("❌ Failed")
                : chalk.gray("⚪ Not configured");

          const time = result.requestDuration
            ? ` (${result.requestDuration}ms)`
            : "";
          const model = result.model ? ` [${result.model}]` : "";
          logger.always(`${result.provider}: ${status}${time}${model}`);
        }

        if (argv.verbose && !argv.quiet) {
          logger.always(chalk.blue("\n📋 Detailed Results (Dry-run):"));
          logger.always(JSON.stringify(mockResults, null, 2));
        }

        return;
      }

      // Use SDK's provider diagnostic method instead of manual testing
      const results = await sdk.getProviderStatus({ quiet: !!argv.quiet });

      if (spinner) {
        const working = results.filter((r) => r.status === "working").length;
        const configured = results.filter((r) => r.configured).length;
        spinner.succeed(
          `Provider check complete: ${working}/${configured} providers working`,
        );
      }

      // Display results
      for (const result of results) {
        const status =
          result.status === "working"
            ? chalk.green("✅ Working")
            : result.status === "failed"
              ? chalk.red("❌ Failed")
              : chalk.gray("⚪ Not configured");

        const time = result.responseTime ? ` (${result.responseTime}ms)` : "";
        const model = result.model ? ` [${result.model}]` : "";
        logger.always(`${result.provider}: ${status}${time}${model}`);

        if (argv.verbose && result.error) {
          logger.always(`  Error: ${chalk.red(result.error)}`);
        }
      }

      if (argv.verbose && !argv.quiet) {
        logger.always(chalk.blue("\n📋 Detailed Results:"));
        logger.always(JSON.stringify(results, null, 2));
      }
    } catch (error) {
      if (spinner) {
        spinner.fail("Provider status check failed");
      }
      handleError(error as Error, "Provider status check");
    } finally {
      // Ensure all background processes are terminated
      try {
        await sdk.shutdownExternalMCPServers();
      } catch (shutdownError) {
        logger.error("Error during SDK shutdown:", shutdownError);
      }
      if (!globalSession.getCurrentSessionId()) {
        process.exit();
      }
    }
  }

  /**
   * Handle stdin input for generate command
   */
  private static async handleGenerateStdinInput(
    argv: GenerateCommandArgs,
  ): Promise<string> {
    if (!argv.input && !process.stdin.isTTY) {
      let stdinData = "";
      process.stdin.setEncoding("utf8");
      for await (const chunk of process.stdin) {
        stdinData += chunk;
      }
      const trimmedData = stdinData.trim();
      if (!trimmedData) {
        throw new Error("No input received from stdin");
      }
      return trimmedData;
    } else if (!argv.input) {
      throw new Error(
        'Input required. Use: neurolink generate "your prompt" or echo "prompt" | neurolink generate',
      );
    }
    return argv.input as string;
  }

  /**
   * Detect output mode (video, ppt, or text) based on CLI arguments
   */
  private static detectGenerateOutputMode(
    argv: GenerateCommandArgs,
    options: BaseCommandArgs & Record<string, unknown>,
  ): { isVideoMode: boolean; isPPTMode: boolean; spinnerMessage: string } {
    const outputMode = (options as Record<string, unknown>).outputMode;

    const isVideoMode = outputMode === "video";

    const hasPPTFlags =
      argv.pptPages !== undefined ||
      argv.pptTheme !== undefined ||
      argv.pptAudience !== undefined ||
      argv.pptTone !== undefined ||
      argv.pptOutput !== undefined ||
      argv.pptAspectRatio !== undefined ||
      argv.pptNoImages === true;

    const hasVideoSignals =
      outputMode === "video" || argv.videoOutput !== undefined;
    const hasPPTSignals = outputMode === "ppt" || hasPPTFlags;

    if (hasVideoSignals && hasPPTSignals) {
      throw new Error(
        "Conflicting output mode signals detected. Use either video mode (--outputMode video, optionally with --videoOutput) or PPT mode (--outputMode ppt / --ppt* flags), not both.",
      );
    }

    const isPPTMode = outputMode === "ppt" || hasPPTFlags;

    const spinnerMessage = isVideoMode
      ? "🎬 Generating video... (this may take 1-2 minutes)"
      : isPPTMode
        ? "📊 Generating presentation... (this may take 2-5 minutes)"
        : "🤖 Generating text...";

    return { isVideoMode, isPPTMode, spinnerMessage };
  }

  /**
   * Process context for generation command
   */
  private static processGenerateContext(
    inputText: string,
    options: BaseCommandArgs & Record<string, unknown>,
  ): { inputText: string; contextMetadata: Partial<BaseContext> | undefined } {
    let processedInputText = inputText;
    let contextMetadata: Partial<BaseContext> | undefined;

    if (options.context && options.contextConfig) {
      const processedContextResult = ContextFactory.processContext(
        options.context as unknown as BaseContext,
        options.contextConfig,
      );

      if (processedContextResult.processedContext) {
        processedInputText =
          processedContextResult.processedContext + processedInputText;
      }

      contextMetadata = {
        ...ContextFactory.extractAnalyticsContext(
          options.context as unknown as BaseContext,
        ),
        contextMode: processedContextResult.config.mode,
        contextTruncated: processedContextResult.metadata.truncated,
      };

      if (options.debug) {
        logger.debug("Context processed:", {
          mode: processedContextResult.config.mode,
          truncated: processedContextResult.metadata.truncated,
          processingTime: processedContextResult.metadata.processingTime,
        });
      }
    }

    return { inputText: processedInputText, contextMetadata };
  }

  /**
   * Build multimodal input from CLI arguments
   */
  private static buildGenerateMultimodalInput(
    inputText: string,
    argv: GenerateCommandArgs,
  ): {
    text: string;
    images?: Array<Buffer | string>;
    csvFiles?: Array<Buffer | string>;
    pdfFiles?: Array<Buffer | string>;
    videoFiles?: Array<Buffer | string>;
    files?: Array<Buffer | string>;
  } {
    const imageBuffers = CLICommandFactory.processCliImages(
      argv.image as string | string[] | undefined,
    );
    const csvFiles = CLICommandFactory.processCliCSVFiles(
      argv.csv as string | string[] | undefined,
    );
    const pdfFiles = CLICommandFactory.processCliPDFFiles(
      argv.pdf as string | string[] | undefined,
    );
    const videoFiles = CLICommandFactory.processCliVideoFiles(
      argv.video as string | string[] | undefined,
    );
    const files = CLICommandFactory.processCliFiles(
      argv.file as string | string[] | undefined,
    );

    return {
      text: inputText,
      ...(imageBuffers && { images: imageBuffers }),
      ...(csvFiles && { csvFiles }),
      ...(pdfFiles && { pdfFiles }),
      ...(videoFiles && { videoFiles }),
      ...(files && { files }),
    };
  }

  /**
   * Build output configuration for generate request
   */
  private static buildGenerateOutputConfig(
    isVideoMode: boolean,
    isPPTMode: boolean,
    enhancedOptions: BaseCommandArgs & Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (isVideoMode) {
      return {
        mode: "video" as const,
        video: {
          resolution: enhancedOptions.videoResolution as
            | "720p"
            | "1080p"
            | undefined,
          length: enhancedOptions.videoLength as 4 | 6 | 8 | undefined,
          aspectRatio: enhancedOptions.videoAspectRatio as
            | "9:16"
            | "16:9"
            | undefined,
          audio: enhancedOptions.videoAudio as boolean | undefined,
        },
      };
    }

    if (isPPTMode) {
      return {
        mode: "ppt" as const,
        ppt: {
          pages: (enhancedOptions.pptPages as number) || 10,
          theme: enhancedOptions.pptTheme as
            | "modern"
            | "corporate"
            | "creative"
            | "minimal"
            | "dark"
            | undefined,
          audience: enhancedOptions.pptAudience as
            | "business"
            | "students"
            | "technical"
            | "general"
            | undefined,
          tone: enhancedOptions.pptTone as
            | "professional"
            | "casual"
            | "educational"
            | "persuasive"
            | undefined,
          aspectRatio:
            (enhancedOptions.pptAspectRatio as "16:9" | "4:3") || "16:9",
          generateAIImages: !(enhancedOptions.pptNoImages as boolean),
          outputPath: enhancedOptions.pptOutput as string | undefined,
        },
      };
    }

    return undefined;
  }

  /**
   * Handle successful generation result
   */
  private static async handleGenerateSuccess(
    result: CliGenerateResult | unknown,
    options: BaseCommandArgs & Record<string, unknown>,
    isVideoMode: boolean,
    isPPTMode: boolean,
    spinner: ReturnType<typeof ora> | null,
  ): Promise<void> {
    const genResult = result as CliGenerateResult;
    if (spinner) {
      if (isVideoMode) {
        spinner.succeed(chalk.green("✅ Video generated successfully!"));
      } else if (isPPTMode) {
        spinner.succeed(chalk.green("✅ Presentation generated successfully!"));
      } else {
        spinner.succeed(chalk.green("✅ Text generated successfully!"));
      }
    }

    if (!options.quiet) {
      const providerInfo = genResult.provider || "auto";
      const modelInfo = genResult.model || "default";
      logger.always(
        chalk.gray(`🔧 Provider: ${providerInfo} | Model: ${modelInfo}`),
      );
    }

    if (!isVideoMode && !isPPTMode) {
      CLICommandFactory.handleOutput(genResult, options);
    }

    await CLICommandFactory.handleTTSOutput(genResult, options);
    await CLICommandFactory.handleVideoOutput(genResult, options);
    await CLICommandFactory.handlePPTOutput(genResult, options);

    if (options.debug) {
      logger.debug("\n" + chalk.yellow("Debug Information:"));
      logger.debug("Provider:", genResult.provider);
      logger.debug("Model:", genResult.model);
      if (genResult.analytics) {
        logger.debug(
          "Analytics:",
          JSON.stringify(genResult.analytics, null, 2),
        );
      }
      if (genResult.evaluation) {
        logger.debug(
          "Evaluation:",
          JSON.stringify(genResult.evaluation, null, 2),
        );
      }
    }

    if (!globalSession.getCurrentSessionId()) {
      await CLICommandFactory.flushLangfuseTraces();
      process.exit(0);
    }
  }

  /**
   * Execute the generate command
   */
  private static async executeGenerate(argv: GenerateCommandArgs) {
    // Handle stdin input
    const rawInput = await CLICommandFactory.handleGenerateStdinInput(argv);
    argv.input = rawInput;

    const options = CLICommandFactory.processOptions(argv);

    // Detect output mode
    const { isVideoMode, isPPTMode, spinnerMessage } =
      CLICommandFactory.detectGenerateOutputMode(argv, options);

    const spinner = argv.quiet ? null : ora(spinnerMessage).start();

    try {
      // Add delay if specified
      if (options.delay) {
        await new Promise((resolve) => setTimeout(resolve, options.delay));
      }

      CLICommandFactory.validateCliInputFiles(argv);

      // Process context
      const { inputText, contextMetadata } =
        CLICommandFactory.processGenerateContext(rawInput, options);

      // Handle dry-run mode for testing
      if (options.dryRun) {
        const mockResult = {
          content: "Mock response for testing purposes",
          provider: options.provider || "auto",
          model: options.model || "test-model",
          usage: { input: 10, output: 15, total: 25 },
          responseTime: 150,
          analytics: options.enableAnalytics
            ? {
                provider: options.provider || "auto",
                model: options.model || "test-model",
                tokenUsage: { input: 10, output: 15, total: 25 },
                cost: 0.00025,
                requestDuration: 150,
                context: contextMetadata,
              }
            : undefined,
          evaluation: options.enableEvaluation
            ? normalizeEvaluationData({
                relevance: 8,
                accuracy: 9,
                completeness: 8,
                overall: 8.3,
                reasoning: "Test evaluation response",
                evaluationModel: "test-evaluator",
                evaluationTime: 50,
              })
            : undefined,
        };

        if (spinner) {
          spinner.succeed(chalk.green("✅ Dry-run completed successfully!"));
        }
        CLICommandFactory.handleOutput(mockResult, options);
        if (options.debug) {
          logger.debug("\n" + chalk.yellow("Debug Information (Dry-run):"));
          logger.debug("Provider:", mockResult.provider);
          logger.debug("Model:", mockResult.model);
          logger.debug("Mode: DRY-RUN (no actual API calls made)");
        }
        if (!globalSession.getCurrentSessionId()) {
          await CLICommandFactory.flushLangfuseTraces();
          process.exit(0);
        }
        return;
      }

      // Initialize SDK and session
      const sdk = globalSession.getOrCreateNeuroLink();
      const sessionVariables = globalSession.getSessionVariables();
      const enhancedOptions = {
        ...options,
        ...sessionVariables,
        // enabledToolNames must be string[] for the SDK — normalize from CSV string
        ...(typeof sessionVariables.enabledToolNames === "string" && {
          enabledToolNames: (sessionVariables.enabledToolNames as string)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      };
      const sessionId = globalSession.getCurrentSessionId();
      const context = sessionId
        ? { ...options.context, sessionId }
        : options.context;

      if (options.debug) {
        logger.debug("CLI Tools configuration:", {
          disableTools: options.disableTools,
          toolsEnabled: !options.disableTools,
        });
      }

      // Configure mode-specific options
      if (isVideoMode) {
        CLICommandFactory.configureVideoMode(enhancedOptions, argv, options);
      }
      if (isPPTMode) {
        CLICommandFactory.configurePPTMode(enhancedOptions, argv, options);
      }

      // Build multimodal input and output configuration
      const generateInput = CLICommandFactory.buildGenerateMultimodalInput(
        inputText,
        argv,
      );
      const outputConfig = CLICommandFactory.buildGenerateOutputConfig(
        isVideoMode,
        isPPTMode,
        enhancedOptions,
      );

      const runGenerate = () =>
        sdk.generate({
          input: generateInput,
          csvOptions: {
            maxRows: argv.csvMaxRows as number | undefined,
            formatStyle: argv.csvFormat as
              | "raw"
              | "markdown"
              | "json"
              | undefined,
          },
          videoOptions: {
            frames: argv.videoFrames as number | undefined,
            quality: argv.videoQuality as number | undefined,
            format: argv.videoFormat as "jpeg" | "png" | undefined,
            transcribeAudio: argv.transcribeAudio as boolean | undefined,
          },
          output: outputConfig,
          provider: enhancedOptions.provider,
          model: enhancedOptions.model,
          temperature: enhancedOptions.temperature,
          maxTokens: enhancedOptions.maxTokens,
          systemPrompt: enhancedOptions.systemPrompt,
          timeout: enhancedOptions.timeout
            ? enhancedOptions.timeout * 1000
            : undefined,
          disableTools: enhancedOptions.disableTools,
          enabledToolNames: enhancedOptions.enabledToolNames as
            | string[]
            | undefined,
          enableAnalytics: enhancedOptions.enableAnalytics,
          enableEvaluation: enhancedOptions.enableEvaluation,
          evaluationDomain: enhancedOptions.evaluationDomain as
            | string
            | undefined,
          toolUsageContext: enhancedOptions.toolUsageContext as
            | string
            | undefined,
          context: context,
          region: (options as Record<string, unknown>).region as
            | string
            | undefined,
          thinkingConfig: createThinkingConfigFromRecord(
            options as Record<string, unknown>,
          ),
          factoryConfig: enhancedOptions.domain
            ? {
                domainType: enhancedOptions.domain,
                enhancementType: "domain-configuration",
                validateDomainData: true,
              }
            : undefined,
          // RAG configuration
          rag: (argv.ragFiles as string[] | undefined)?.length
            ? {
                files: argv.ragFiles as string[],
                strategy: argv.ragStrategy as ChunkingStrategy | undefined,
                chunkSize: argv.ragChunkSize as number | undefined,
                chunkOverlap: argv.ragChunkOverlap as number | undefined,
                topK: argv.ragTopK as number | undefined,
              }
            : undefined,
          // TTS configuration
          tts: enhancedOptions.tts
            ? {
                enabled: true,
                useAiResponse: true,
                voice: enhancedOptions.ttsVoice as string | undefined,
                format:
                  (enhancedOptions.ttsFormat as
                    | "mp3"
                    | "wav"
                    | "ogg"
                    | "opus") || undefined,
                speed: enhancedOptions.ttsSpeed as number | undefined,
                quality: enhancedOptions.ttsQuality as
                  | "standard"
                  | "hd"
                  | undefined,
                output: enhancedOptions.ttsOutput as string | undefined,
                play: enhancedOptions.ttsPlay as boolean | undefined,
              }
            : undefined,
        });
      const result = await runGenerate();

      // Handle successful result
      await CLICommandFactory.handleGenerateSuccess(
        result,
        options,
        isVideoMode,
        isPPTMode,
        spinner,
      );
    } catch (error) {
      if (spinner) {
        spinner.fail();
      }
      handleError(error as Error, "Generation");
    }
  }

  /**
   * Process context for streaming
   */
  private static async processStreamContext(
    argv: StreamCommandArgs,
    options: BaseCommandArgs & Record<string, unknown>,
  ): Promise<{
    inputText: string;
    contextMetadata: Partial<BaseContext> | undefined;
  }> {
    let inputText = argv.input as string;
    let contextMetadata: Partial<BaseContext> | undefined;

    if (options.context && options.contextConfig) {
      const processedContextResult = ContextFactory.processContext(
        options.context as BaseContext,
        options.contextConfig,
      );

      // Integrate context into prompt if configured
      if (processedContextResult.processedContext) {
        inputText = processedContextResult.processedContext + inputText;
      }

      // Add context metadata for analytics
      contextMetadata = {
        ...ContextFactory.extractAnalyticsContext(
          options.context as BaseContext,
        ),
        contextMode: processedContextResult.config.mode,
        contextTruncated: processedContextResult.metadata.truncated,
      };

      if (options.debug) {
        logger.debug("Context processed for streaming:", {
          mode: processedContextResult.config.mode,
          truncated: processedContextResult.metadata.truncated,
          processingTime: processedContextResult.metadata.processingTime,
        });
      }
    }

    return { inputText, contextMetadata };
  }

  /**
   * Execute dry-run streaming simulation
   */
  private static async executeDryRunStream(
    options: BaseCommandArgs & Record<string, unknown>,
    contextMetadata: Partial<BaseContext> | undefined,
  ): Promise<void> {
    if (!options.quiet) {
      logger.always(chalk.blue("🔄 Dry-run streaming..."));
    }

    // Simulate streaming output
    const chunks = [
      "Mock ",
      "streaming ",
      "response ",
      "for ",
      "testing ",
      "purposes",
    ];
    let fullContent = "";

    for (const chunk of chunks) {
      await animatedWrite(chunk);
      fullContent += chunk;
      await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate streaming delay
    }

    if (!options.quiet) {
      process.stdout.write("\n");
    }

    // Mock analytics and evaluation for dry-run
    if (options.enableAnalytics) {
      const mockAnalytics: AnalyticsData = {
        provider: (options.provider as string) || "auto",
        model: (options.model as string) || "test-model",
        requestDuration: 300,
        tokenUsage: {
          input: 10,
          output: 15,
          total: 25,
        },
        timestamp: new Date().toISOString(),
        context: contextMetadata as JsonValue,
      };

      const mockGenerateResult: CliGenerateResult = {
        success: true,
        content: fullContent,
        analytics: mockAnalytics,
        model: mockAnalytics.model,
        toolsUsed: [],
      };

      const analyticsDisplay =
        CLICommandFactory.formatAnalyticsForTextMode(mockGenerateResult);
      logger.always(analyticsDisplay);
    }

    if (options.enableEvaluation) {
      logger.always(chalk.blue("\n📊 Response Evaluation (Dry-run):"));
      logger.always(`   Relevance: 8/10`);
      logger.always(`   Accuracy: 9/10`);
      logger.always(`   Completeness: 8/10`);
      logger.always(`   Overall: 8.3/10`);
      logger.always(`   Reasoning: Test evaluation response`);
    }

    if (options.output) {
      fs.writeFileSync(options.output as string, fullContent);
      if (!options.quiet) {
        logger.always(`\nOutput saved to ${options.output}`);
      }
    }

    if (options.debug) {
      logger.debug(
        "\n" + chalk.yellow("Debug Information (Dry-run Streaming):"),
      );
      logger.debug("Provider:", options.provider || "auto");
      logger.debug("Model:", options.model || "test-model");
      logger.debug("Mode: DRY-RUN (no actual API calls made)");
    }

    if (!globalSession.getCurrentSessionId()) {
      await CLICommandFactory.flushLangfuseTraces();
      process.exit(0);
    }
  }

  /**
   * Execute real streaming with timeout handling
   */
  private static async executeRealStream(
    argv: StreamCommandArgs,
    options: BaseCommandArgs & Record<string, unknown>,
    inputText: string,
    contextMetadata: Partial<BaseContext> | undefined,
  ): Promise<string> {
    const sdk = globalSession.getOrCreateNeuroLink();
    const sessionVariables = globalSession.getSessionVariables();
    const enhancedOptions = { ...options, ...sessionVariables };
    const sessionId = globalSession.getCurrentSessionId();
    const context = sessionId
      ? { ...contextMetadata, sessionId }
      : contextMetadata;

    // Process CLI multimodal inputs
    const imageBuffers = CLICommandFactory.processCliImages(
      argv.image as string | string[] | undefined,
    );
    const csvFiles = CLICommandFactory.processCliCSVFiles(
      argv.csv as string | string[] | undefined,
    );
    const pdfFiles = CLICommandFactory.processCliPDFFiles(
      argv.pdf as string | string[] | undefined,
    );
    const videoFiles = CLICommandFactory.processCliVideoFiles(
      argv.video as string | string[] | undefined,
    );
    const files = CLICommandFactory.processCliFiles(
      argv.file as string | string[] | undefined,
    );

    const runStream = () =>
      sdk.stream({
        input: {
          text: inputText,
          ...(imageBuffers && { images: imageBuffers }),
          ...(csvFiles && { csvFiles }),
          ...(pdfFiles && { pdfFiles }),
          ...(videoFiles && { videoFiles }),
          ...(files && { files }),
        },
        csvOptions: {
          maxRows: argv.csvMaxRows as number | undefined,
          formatStyle: argv.csvFormat as
            | "raw"
            | "markdown"
            | "json"
            | undefined,
        },
        videoOptions: {
          frames: argv.videoFrames as number | undefined,
          quality: argv.videoQuality as number | undefined,
          format: argv.videoFormat as "jpeg" | "png" | undefined,
          transcribeAudio: argv.transcribeAudio as boolean | undefined,
        },
        provider: enhancedOptions.provider as string | undefined,
        model: enhancedOptions.model as string | undefined,
        temperature: enhancedOptions.temperature as number | undefined,
        maxTokens: enhancedOptions.maxTokens as number | undefined,
        systemPrompt: enhancedOptions.systemPrompt as string | undefined,
        timeout: enhancedOptions.timeout
          ? (enhancedOptions.timeout as number) * 1000
          : undefined,
        disableTools: enhancedOptions.disableTools as boolean | undefined,
        enabledToolNames: enhancedOptions.enabledToolNames as
          | string[]
          | undefined,
        enableAnalytics: enhancedOptions.enableAnalytics as boolean | undefined,
        enableEvaluation: enhancedOptions.enableEvaluation as
          | boolean
          | undefined,
        evaluationDomain: enhancedOptions.evaluationDomain as
          | string
          | undefined,
        toolUsageContext: enhancedOptions.toolUsageContext as
          | string
          | undefined,
        context: context,
        region: (options as Record<string, unknown>).region as
          | string
          | undefined,
        thinkingConfig: createThinkingConfigFromRecord(
          options as Record<string, unknown>,
        ),
        factoryConfig: enhancedOptions.domain
          ? {
              domainType: enhancedOptions.domain as string,
              enhancementType: "domain-configuration",
              validateDomainData: true,
            }
          : undefined,
        // RAG configuration
        rag: (argv.ragFiles as string[] | undefined)?.length
          ? {
              files: argv.ragFiles as string[],
              strategy: argv.ragStrategy as ChunkingStrategy | undefined,
              chunkSize: argv.ragChunkSize as number | undefined,
              chunkOverlap: argv.ragChunkOverlap as number | undefined,
              topK: argv.ragTopK as number | undefined,
            }
          : undefined,
        // TTS configuration
        tts: enhancedOptions.tts
          ? {
              enabled: true,
              useAiResponse: true,
              voice: enhancedOptions.ttsVoice as string | undefined,
              format:
                (enhancedOptions.ttsFormat as "mp3" | "wav" | "ogg" | "opus") ||
                undefined,
              speed: enhancedOptions.ttsSpeed as number | undefined,
              quality: enhancedOptions.ttsQuality as
                | "standard"
                | "hd"
                | undefined,
              output: enhancedOptions.ttsOutput as string | undefined,
              play: enhancedOptions.ttsPlay as boolean | undefined,
            }
          : undefined,
      });
    const stream = await runStream();

    const streamResult = await CLICommandFactory.processStreamWithTimeout(
      stream,
      options,
    );

    await CLICommandFactory.displayStreamResults(
      stream,
      streamResult.content,
      options,
    );

    // Handle image output from stream (image models emit image events)
    if (streamResult.imageBase64) {
      try {
        let imagePath: string;
        if (options.imageOutput) {
          imagePath = path.resolve(options.imageOutput as string);
          const dir = path.dirname(imagePath);
          if (dir && dir !== "." && !fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
        } else {
          const imageDir = "generated-images";
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          imagePath = path.join(imageDir, `image-${timestamp}.png`);
          if (!fs.existsSync(imageDir)) {
            fs.mkdirSync(imageDir, { recursive: true });
          }
        }
        const imageBuffer = Buffer.from(streamResult.imageBase64, "base64");
        fs.writeFileSync(imagePath, imageBuffer);
        logger.always(`\n📸 Generated image saved to: ${imagePath}`);
        logger.always(
          `   Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`,
        );
      } catch (error) {
        handleError(error as Error, "Failed to save streamed image");
      }
    }

    return streamResult.content;
  }

  /**
   * Process stream with timeout handling
   */
  private static async processStreamWithTimeout(
    stream: {
      stream: AsyncIterable<
        | { content: string }
        | { type: "audio" }
        | { type: "image"; imageOutput: { base64: string } }
      >;
    },
    options: BaseCommandArgs & Record<string, unknown>,
  ): Promise<{ content: string; imageBase64?: string }> {
    let fullContent = "";
    let lastImageBase64: string | undefined;
    let contentReceived = false;
    const abortController = new AbortController();
    // BZ-667: Wire SIGINT to abort stream gracefully
    const abortHandler = createStreamAbortHandler();
    abortHandler.signal.addEventListener(
      "abort",
      () => {
        abortController.abort();
      },
      { once: true },
    );

    // Create timeout promise for stream consumption (default: 30 seconds, respects user-provided timeout)
    const streamTimeout =
      options.timeout && typeof options.timeout === "number"
        ? options.timeout * 1000
        : 30000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        if (!contentReceived) {
          const timeoutError = new Error(
            `\n❌ Stream timeout - no content received within ${streamTimeout / 1000} seconds\n` +
              "This usually indicates authentication or network issues\n\n" +
              "🔧 Try these steps:\n" +
              "1. Check your provider credentials are configured correctly\n" +
              `2. Test generate mode: neurolink generate "test" --provider ${options.provider}\n` +
              `3. Use debug mode: neurolink stream "test" --provider ${options.provider} --debug`,
          );
          reject(timeoutError);
        }
      }, streamTimeout);

      // Clean up timeout when aborted
      abortController.signal.addEventListener("abort", () => {
        clearTimeout(timeoutId);
      });
    });

    const streamIterator = stream.stream[Symbol.asyncIterator]();
    try {
      // Process the stream with timeout handling
      let timeoutActive = true;

      // BZ-667: Create an abort promise that rejects when the user presses Ctrl+C,
      // so we can race it against streamIterator.next() and unblock pending reads.
      const abortPromise = new Promise<never>((_, reject) => {
        if (abortHandler.signal.aborted) {
          reject(new DOMException("Stream aborted", "AbortError"));
          return;
        }
        abortHandler.signal.addEventListener(
          "abort",
          () => {
            reject(new DOMException("Stream aborted", "AbortError"));
          },
          { once: true },
        );
      });

      while (true) {
        let nextResult;

        if (timeoutActive && !contentReceived) {
          // Race between next chunk, timeout, and abort signal
          nextResult = await Promise.race([
            streamIterator.next(),
            timeoutPromise,
            abortPromise,
          ]);
        } else {
          // Race between next chunk and abort signal
          nextResult = await Promise.race([
            streamIterator.next(),
            abortPromise,
          ]);
        }

        if (nextResult.done) {
          break;
        }

        if (!contentReceived) {
          contentReceived = true;
          timeoutActive = false;
          abortController.abort(); // Cancel timeout
        }

        if (options.delay && (options.delay as number) > 0) {
          // Demo mode - add delay between chunks
          await new Promise((resolve) =>
            setTimeout(resolve, options.delay as number),
          );
        }

        const evt: unknown = nextResult.value;
        const isText = (o: unknown): o is { content: string } =>
          !!o &&
          typeof o === "object" &&
          typeof (o as Record<string, unknown>).content === "string";
        const isAudio = (o: unknown): o is { type: "audio" } =>
          !!o &&
          typeof o === "object" &&
          (o as Record<string, unknown>).type === "audio";
        const isImage = (
          o: unknown,
        ): o is { type: "image"; imageOutput: { base64: string } } => {
          if (!o || typeof o !== "object") {
            return false;
          }
          const record = o as Record<string, unknown>;
          if (record.type !== "image") {
            return false;
          }
          if (!record.imageOutput || typeof record.imageOutput !== "object") {
            return false;
          }
          return (
            typeof (record.imageOutput as Record<string, unknown>).base64 ===
            "string"
          );
        };

        if (isText(evt)) {
          await animatedWrite(evt.content);
          fullContent += evt.content;
        } else if (isAudio(evt)) {
          if (options.debug && !options.quiet) {
            process.stdout.write("[audio-chunk]");
          }
        } else if (isImage(evt)) {
          lastImageBase64 = evt.imageOutput.base64;
          if (options.debug && !options.quiet) {
            process.stdout.write("[image-received]");
          }
        }
      }
    } catch (error) {
      abortController.abort(); // Clean up timeout
      // BZ-667: Close the stream iterator so the provider connection is released.
      // Wrap in try/catch to prevent cleanup failures from masking the original error.
      try {
        await streamIterator.return?.();
      } catch {
        // Iterator cleanup failed — swallow so the original error propagates
      }
      abortHandler.cleanup();
      // BZ-667: Handle graceful abort — return partial content instead of throwing
      if (
        abortHandler.signal.aborted ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        if (!options.quiet) {
          process.stdout.write("\n");
        }
        return { content: fullContent, imageBase64: lastImageBase64 };
      }
      throw error;
    }

    abortHandler.cleanup();

    if (!contentReceived) {
      throw new Error(
        "\n❌ No content received from stream\n" +
          "Check your credentials and provider configuration",
      );
    }

    if (!options.quiet) {
      process.stdout.write("\n");
    }

    return { content: fullContent, imageBase64: lastImageBase64 };
  }

  /**
   * Display analytics and evaluation results
   */
  private static async displayStreamResults(
    stream: {
      analytics?: unknown;
      evaluation?: unknown;
      model?: string;
      toolCalls?: Array<{ toolName: string }>;
    },
    fullContent: string,
    options: BaseCommandArgs & Record<string, unknown>,
  ): Promise<void> {
    // Display analytics after streaming
    if (options.enableAnalytics && stream.analytics) {
      const resolvedAnalytics = await (stream.analytics instanceof Promise
        ? stream.analytics
        : Promise.resolve(stream.analytics));
      const streamAnalytics = {
        success: true,
        content: fullContent,
        analytics: resolvedAnalytics,
        model: stream.model,
        toolsUsed: stream.toolCalls?.map((tc) => tc.toolName) || [],
      };
      const analyticsDisplay = CLICommandFactory.formatAnalyticsForTextMode(
        streamAnalytics as unknown as CliGenerateResult,
      );
      logger.always(analyticsDisplay);
    }

    // Display evaluation after streaming
    if (options.enableEvaluation && stream.evaluation) {
      const resolvedEvaluation = await (stream.evaluation instanceof Promise
        ? stream.evaluation
        : Promise.resolve(stream.evaluation));
      logger.always(chalk.blue("\n📊 Response Evaluation:"));
      logger.always(`   Relevance: ${resolvedEvaluation.relevance}/10`);
      logger.always(`   Accuracy: ${resolvedEvaluation.accuracy}/10`);
      logger.always(`   Completeness: ${resolvedEvaluation.completeness}/10`);
      logger.always(`   Overall: ${resolvedEvaluation.overall}/10`);
      if (resolvedEvaluation.reasoning) {
        logger.always(`   Reasoning: ${resolvedEvaluation.reasoning}`);
      }
    }
  }

  /**
   * Handle stream output file writing and debug output
   */
  private static async handleStreamOutput(
    options: BaseCommandArgs & Record<string, unknown>,
    fullContent: string,
  ): Promise<void> {
    // Handle output file if specified
    if (options.output) {
      fs.writeFileSync(options.output as string, fullContent);
      if (!options.quiet) {
        logger.always(`\nOutput saved to ${options.output}`);
      }
    }

    // Handle TTS audio output if --tts-output is provided
    // Note: For streaming, TTS audio is collected during the stream
    // and saved at the end if available
    const ttsOutputPath = options.ttsOutput as string | undefined;
    if (ttsOutputPath) {
      // For now, streaming TTS output is not yet available
      // This will be enabled when the TTS streaming infrastructure is complete
      if (!options.quiet) {
        logger.always(
          chalk.yellow(
            "⚠️  TTS audio output for streaming is not yet available. Use 'generate' command for TTS output.",
          ),
        );
      }
    }

    // Debug output for streaming
    if (options.debug) {
      await CLICommandFactory.logStreamDebugInfo({
        provider: options.provider as string,
        model: options.model as string,
      });
    }
  }

  /**
   * Log debug information for stream result
   */
  private static async logStreamDebugInfo(stream: {
    provider?: string;
    model?: string;
    analytics?: unknown;
    evaluation?: unknown;
    metadata?: unknown;
  }): Promise<void> {
    logger.debug("\n" + chalk.yellow("Debug Information (Streaming):"));
    logger.debug("Provider:", stream.provider);
    logger.debug("Model:", stream.model);
    if (stream.analytics) {
      const resolvedAnalytics = await (stream.analytics instanceof Promise
        ? stream.analytics
        : Promise.resolve(stream.analytics));
      logger.debug("Analytics:", JSON.stringify(resolvedAnalytics, null, 2));
    }
    if (stream.evaluation) {
      const resolvedEvaluation = await (stream.evaluation instanceof Promise
        ? stream.evaluation
        : Promise.resolve(stream.evaluation));
      logger.debug("Evaluation:", JSON.stringify(resolvedEvaluation, null, 2));
    }
    if (stream.metadata) {
      logger.debug("Metadata:", JSON.stringify(stream.metadata, null, 2));
    }
  }

  /**
   * Handle stdin input for stream command
   */
  private static async handleStdinInput(
    argv: StreamCommandArgs,
  ): Promise<void> {
    if (!argv.input && !process.stdin.isTTY) {
      let stdinData = "";
      process.stdin.setEncoding("utf8");
      for await (const chunk of process.stdin) {
        stdinData += chunk;
      }
      argv.input = stdinData.trim();
      if (!argv.input) {
        throw new Error("No input received from stdin");
      }
    } else if (!argv.input) {
      throw new Error(
        'Input required. Use: neurolink stream "your prompt" or echo "prompt" | neurolink stream',
      );
    }
  }

  /**
   * Execute the stream command
   */
  private static async executeStream(argv: StreamCommandArgs) {
    await CLICommandFactory.handleStdinInput(argv);

    const options = CLICommandFactory.processOptions(argv);

    // Validate Anthropic subscription options if using Anthropic provider
    CLICommandFactory.validateAnthropicSubscriptionOptions(
      options as Record<string, unknown>,
    );

    if (!options.quiet) {
      logger.always(chalk.blue("🔄 Streaming..."));
    }

    try {
      // Add delay if specified
      if (options.delay) {
        await new Promise((resolve) => setTimeout(resolve, options.delay));
      }

      CLICommandFactory.validateCliInputFiles(argv);

      const { inputText, contextMetadata } =
        await CLICommandFactory.processStreamContext(argv, options);

      // Handle dry-run mode for testing
      if (options.dryRun) {
        await CLICommandFactory.executeDryRunStream(options, contextMetadata);
        return;
      }

      const fullContent = await CLICommandFactory.executeRealStream(
        argv,
        options,
        inputText,
        contextMetadata,
      );

      await CLICommandFactory.handleStreamOutput(options, fullContent);

      if (!globalSession.getCurrentSessionId()) {
        await CLICommandFactory.flushLangfuseTraces();
        process.exit(0);
      }
    } catch (error) {
      handleError(error as Error, "Streaming");
    }
  }

  /**
   * Execute the batch command
   */
  private static async executeBatch(argv: BatchCommandArgs) {
    const options = CLICommandFactory.processOptions(argv);

    // Validate Anthropic subscription options if using Anthropic provider
    CLICommandFactory.validateAnthropicSubscriptionOptions(
      options as Record<string, unknown>,
    );

    const spinner = options.quiet ? null : ora().start();

    try {
      if (!argv.file) {
        throw new Error("No file specified");
      }

      if (!fs.existsSync(argv.file)) {
        throw new Error(`File not found: ${argv.file}`);
      }

      const buffer = fs.readFileSync(argv.file);
      const prompts = buffer
        .toString("utf8")
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean);

      if (prompts.length === 0) {
        throw new Error("No prompts found in file");
      }

      if (spinner) {
        spinner.text = `📦 Processing ${prompts.length} prompts...`;
      } else if (!options.quiet) {
        logger.always(
          chalk.blue(`📦 Processing ${prompts.length} prompts...\n`),
        );
      }

      const results: Array<{
        prompt: string;
        response?: string;
        error?: string;
      }> = [];

      const sdk = globalSession.getOrCreateNeuroLink();
      const sessionVariables = globalSession.getSessionVariables();
      const enhancedOptions = {
        ...options,
        ...sessionVariables,
        // enabledToolNames must be string[] for the SDK — normalize from CSV string
        ...(typeof sessionVariables.enabledToolNames === "string" && {
          enabledToolNames: (sessionVariables.enabledToolNames as string)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      };
      const sessionId = globalSession.getCurrentSessionId();

      for (let i = 0; i < prompts.length; i++) {
        if (spinner) {
          spinner.text = `Processing ${i + 1}/${prompts.length}: ${prompts[i].substring(0, 30)}...`;
        }

        try {
          // Handle dry-run mode for batch processing
          if (options.dryRun) {
            results.push({
              prompt: prompts[i],
              response: `Mock batch response ${i + 1} for testing purposes`,
            });

            if (spinner) {
              spinner.render();
            }
            continue;
          }

          // Process context for each batch item
          let inputText = prompts[i];
          let contextMetadata: Partial<BaseContext> | undefined;

          if (options.context && options.contextConfig) {
            const processedContextResult = ContextFactory.processContext(
              options.context as BaseContext,
              options.contextConfig,
            );

            if (processedContextResult.processedContext) {
              inputText = processedContextResult.processedContext + inputText;
            }

            contextMetadata = {
              ...ContextFactory.extractAnalyticsContext(
                options.context as BaseContext,
              ),
              contextMode: processedContextResult.config.mode,
              contextTruncated: processedContextResult.metadata.truncated,
              batchIndex: i,
            };
          }

          const context = sessionId
            ? { ...contextMetadata, sessionId }
            : contextMetadata;

          const runBatchGenerate = () =>
            sdk.generate({
              input: { text: inputText },
              provider: enhancedOptions.provider,
              model: enhancedOptions.model,
              temperature: enhancedOptions.temperature,
              maxTokens: enhancedOptions.maxTokens,
              systemPrompt: enhancedOptions.systemPrompt,
              timeout: enhancedOptions.timeout
                ? enhancedOptions.timeout * 1000
                : undefined,
              disableTools: enhancedOptions.disableTools,
              enabledToolNames: enhancedOptions.enabledToolNames as
                | string[]
                | undefined,
              evaluationDomain: enhancedOptions.evaluationDomain as
                | string
                | undefined,
              toolUsageContext: enhancedOptions.toolUsageContext as
                | string
                | undefined,
              context: context,
              factoryConfig: enhancedOptions.domain
                ? {
                    domainType: enhancedOptions.domain as string,
                    enhancementType: "domain-configuration",
                    validateDomainData: true,
                  }
                : undefined,
            });
          const result = await runBatchGenerate();

          results.push({ prompt: prompts[i], response: result.content });

          if (spinner) {
            spinner.render();
          }
        } catch (error) {
          results.push({
            prompt: prompts[i],
            error: (error as Error).message,
          });

          if (spinner) {
            spinner.render();
          }
        }

        // Add delay between requests
        if (i < prompts.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, options.delay || 1000),
          );
        }
      }

      if (spinner) {
        spinner.succeed(chalk.green("✅ Batch processing complete!"));
      }

      // Handle output with universal formatting
      CLICommandFactory.handleOutput(results, options);

      if (!globalSession.getCurrentSessionId()) {
        await CLICommandFactory.flushLangfuseTraces();
        process.exit(0);
      }
    } catch (error) {
      if (spinner) {
        spinner.fail();
      }
      handleError(error as Error, "Batch processing");
    }
  }

  /**
   * Execute config export command
   */
  private static async executeConfigExport(argv: BaseCommandArgs) {
    const options = CLICommandFactory.processOptions(argv);

    try {
      const config = {
        providers: {
          openai: !!process.env.OPENAI_API_KEY,
          bedrock: !!(
            process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ),
          vertex: !!(
            process.env.GOOGLE_APPLICATION_CREDENTIALS ||
            process.env.GOOGLE_SERVICE_ACCOUNT_KEY
          ),
          anthropic: !!process.env.ANTHROPIC_API_KEY,
          azure: !!(
            process.env.AZURE_OPENAI_API_KEY &&
            process.env.AZURE_OPENAI_ENDPOINT
          ),
          "google-ai": !!process.env.GOOGLE_AI_API_KEY,
        },
        defaults: {
          temperature: 0.7,
          maxTokens: 500,
        },
        timestamp: new Date().toISOString(),
      };

      CLICommandFactory.handleOutput(config, options);
    } catch (error) {
      handleError(error as Error, "Configuration export");
    }
  }

  /**
   * Execute get best provider command
   */
  private static async executeGetBestProvider(argv: BaseCommandArgs) {
    const options = CLICommandFactory.processOptions(argv);

    try {
      const { getBestProvider } =
        await import("../../lib/utils/providerUtils.js");
      const bestProvider = await getBestProvider();

      if (options.format === "json") {
        CLICommandFactory.handleOutput({ provider: bestProvider }, options);
      } else {
        if (!options.quiet) {
          logger.always(
            chalk.green(`🎯 Best available provider: ${bestProvider}`),
          );
        } else {
          CLICommandFactory.handleOutput(bestProvider, options);
        }
      }
    } catch (error) {
      handleError(error as Error, "Provider selection");
    }
  }

  /**
   * Execute memory stats command
   */
  private static async executeMemoryStats(argv: BaseCommandArgs) {
    const options = CLICommandFactory.processOptions(argv);
    const spinner = options.quiet
      ? null
      : ora("🧠 Getting memory stats...").start();

    try {
      const sdk = globalSession.getOrCreateNeuroLink();

      // Handle dry-run mode
      if (options.dryRun) {
        const mockStats = {
          totalSessions: 5,
          totalTurns: 47,
          memoryUsage: "Active",
        };

        if (spinner) {
          spinner.succeed(chalk.green("✅ Memory stats retrieved (dry-run)"));
        }

        CLICommandFactory.handleOutput(mockStats, options);
        return;
      }

      const stats = await sdk.getConversationStats();

      if (spinner) {
        spinner.succeed(chalk.green("✅ Memory stats retrieved"));
      }

      if (options.format === "json") {
        CLICommandFactory.handleOutput(stats, options);
      } else {
        logger.always(chalk.blue("📊 Conversation Memory Stats:"));
        logger.always(`   Total Sessions: ${stats.totalSessions}`);
        logger.always(`   Total Turns: ${stats.totalTurns}`);
        logger.always(
          `   Memory Status: ${stats.totalSessions > 0 ? "Active" : "Empty"}`,
        );
      }
    } catch (error) {
      if (spinner) {
        spinner.fail("Memory stats failed");
      }

      if ((error as Error).message.includes("not enabled")) {
        logger.always(chalk.yellow("⚠️ Conversation memory is not enabled"));
        logger.always(
          "Enable it by using --enable-conversation-memory with loop mode",
        );
      } else {
        handleError(error as Error, "Memory stats");
      }
    }
  }

  /**
   * Execute memory history command
   */
  private static async executeMemoryHistory(
    argv: BaseCommandArgs & { sessionId: string },
  ) {
    const options = CLICommandFactory.processOptions(argv);
    const spinner = options.quiet
      ? null
      : ora(`🧠 Getting history for ${argv.sessionId}...`).start();

    try {
      const sdk = globalSession.getOrCreateNeuroLink();

      // Handle dry-run mode
      if (options.dryRun) {
        const mockHistory = [
          { role: "user", content: "Hello, how are you?" },
          {
            role: "assistant",
            content: "I'm doing well, thank you! How can I help you today?",
          },
          { role: "user", content: "Can you explain quantum computing?" },
          {
            role: "assistant",
            content: "Quantum computing is a revolutionary technology...",
          },
        ];

        if (spinner) {
          spinner.succeed(
            chalk.green(`✅ History retrieved for ${argv.sessionId} (dry-run)`),
          );
        }

        CLICommandFactory.handleOutput(mockHistory, options);
        return;
      }

      const history = await sdk.getConversationHistory(argv.sessionId);

      if (spinner) {
        spinner.succeed(
          chalk.green(`✅ History retrieved for ${argv.sessionId}`),
        );
      }

      if (history.length === 0) {
        logger.always(
          chalk.yellow(
            `⚠️ No conversation history found for session: ${argv.sessionId}`,
          ),
        );
        return;
      }

      if (options.format === "json") {
        CLICommandFactory.handleOutput(history, options);
      } else {
        logger.always(
          chalk.blue(`💬 Conversation History (${argv.sessionId}):`),
        );
        for (const message of history) {
          const roleColor = message.role === "user" ? chalk.cyan : chalk.green;
          const roleLabel = message.role === "user" ? "User" : "Assistant";
          logger.always(`   [${roleColor(roleLabel)}]: ${message.content}`);
        }
      }
    } catch (error) {
      if (spinner) {
        spinner.fail("Memory history failed");
      }

      if ((error as Error).message.includes("not enabled")) {
        logger.always(chalk.yellow("⚠️ Conversation memory is not enabled"));
        logger.always(
          "Enable it by using --enable-conversation-memory with loop mode",
        );
      } else {
        handleError(error as Error, "Memory history");
      }
    }
  }

  /**
   * Execute memory clear command
   */
  private static async executeMemoryClear(
    argv: BaseCommandArgs & { sessionId?: string },
  ) {
    const options = CLICommandFactory.processOptions(argv);
    const isAllSessions = !argv.sessionId;
    const target = isAllSessions ? "all sessions" : `session ${argv.sessionId}`;
    const spinner = options.quiet
      ? null
      : ora(`🧠 Clearing ${target}...`).start();

    try {
      const sdk = globalSession.getOrCreateNeuroLink();

      // Handle dry-run mode
      if (options.dryRun) {
        if (spinner) {
          spinner.succeed(
            chalk.green(
              `✅ ${isAllSessions ? "All sessions" : "Session"} cleared (dry-run)`,
            ),
          );
        }

        const result = {
          success: true,
          action: isAllSessions ? "clear_all" : "clear_session",
          sessionId: argv.sessionId || null,
          message: `${isAllSessions ? "All sessions" : "Session"} would be cleared`,
        };

        CLICommandFactory.handleOutput(result, options);
        return;
      }

      let success: boolean;
      if (isAllSessions) {
        await sdk.clearAllConversations();
        success = true;
      } else {
        // sessionId is guaranteed to exist when isAllSessions is false
        if (!argv.sessionId) {
          throw new Error(
            "Session ID is required for clearing specific session",
          );
        }
        success = await sdk.clearConversationSession(argv.sessionId);
      }

      if (spinner) {
        if (success) {
          spinner.succeed(
            chalk.green(
              `✅ ${isAllSessions ? "All sessions" : "Session"} cleared successfully`,
            ),
          );
        } else {
          spinner.warn(
            chalk.yellow(
              `⚠️ Session ${argv.sessionId} not found or already empty`,
            ),
          );
        }
      }

      if (options.format === "json") {
        const result = {
          success,
          action: isAllSessions ? "clear_all" : "clear_session",
          sessionId: argv.sessionId || null,
        };
        CLICommandFactory.handleOutput(result, options);
      } else if (!success && !isAllSessions) {
        logger.always(
          chalk.yellow(
            `⚠️ Session ${argv.sessionId} not found or already empty`,
          ),
        );
      } else if (!options.quiet) {
        logger.always(
          chalk.green(
            `✅ ${isAllSessions ? "All conversation history" : `Session ${argv.sessionId}`} cleared`,
          ),
        );
      }
    } catch (error) {
      if (spinner) {
        spinner.fail("Memory clear failed");
      }

      if ((error as Error).message.includes("not enabled")) {
        logger.always(chalk.yellow("⚠️ Conversation memory is not enabled"));
        logger.always(
          "Enable it by using --enable-conversation-memory with loop mode",
        );
      } else {
        handleError(error as Error, "Memory clear");
      }
    }
  }

  /**
   * Execute completion command
   */
  private static async executeCompletion(
    argv: BaseCommandArgs & { output?: string },
  ) {
    try {
      // Generate shell completion script as concatenated strings to avoid template literal issues
      const completionScript =
        "#!/usr/bin/env bash\n\n" +
        "# NeuroLink CLI Bash Completion Script\n" +
        "# Generated by: neurolink completion\n" +
        "# \n" +
        "# Installation instructions:\n" +
        "#   1. Save this script to a file (e.g., ~/.neurolink-completion.sh)\n" +
        "#   2. Add to your shell profile: source ~/.neurolink-completion.sh\n" +
        "#   3. Restart your shell or run: source ~/.bashrc\n\n" +
        "_neurolink_completion() {\n" +
        "    local cur prev opts base\n" +
        "    COMPREPLY=()\n" +
        '    cur="${COMP_WORDS[COMP_CWORD]}"\n' +
        '    prev="${COMP_WORDS[COMP_CWORD - 1]}"\n\n' +
        "    # Main commands\n" +
        "    if [[ ${COMP_CWORD} -eq 1 ]]; then\n" +
        '        opts="generate gen stream batch provider status models mcp discover memory config get-best-provider completion"\n' +
        '        COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )\n' +
        "        return 0\n" +
        "    fi\n\n" +
        "    # Subcommand completion\n" +
        '    case "${COMP_WORDS[1]}" in\n' +
        "        generate|gen)\n" +
        '            case "${prev}" in\n' +
        "                --provider|-p)\n" +
        '                    COMPREPLY=( $(compgen -W "auto openai bedrock vertex googleVertex anthropic azure google-ai huggingface ollama mistral litellm" -- ${cur}) )\n' +
        "                    return 0\n" +
        "                    ;;\n" +
        "                --format|-f|--output-format)\n" +
        '                    COMPREPLY=( $(compgen -W "text json table" -- ${cur}) )\n' +
        "                    return 0\n" +
        "                    ;;\n" +
        "                --model|-m)\n" +
        '                    COMPREPLY=( $(compgen -W "gemini-2.5-pro gemini-2.5-flash gpt-4o gpt-4o-mini claude-3-5-sonnet" -- ${cur}) )\n' +
        "                    return 0\n" +
        "                    ;;\n" +
        "                *)\n" +
        '                    opts="--provider --model --temperature --maxTokens --system --format --output --timeout --delay --disableTools --enableAnalytics --enableEvaluation --debug --quiet --noColor --configFile --dryRun"\n' +
        '                    COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )\n' +
        "                    return 0\n" +
        "                    ;;\n" +
        "            esac\n" +
        "            ;;\n" +
        "        mcp)\n" +
        '            case "${COMP_WORDS[2]}" in\n' +
        "                install)\n" +
        "                    if [[ ${COMP_CWORD} -eq 3 ]]; then\n" +
        '                        COMPREPLY=( $(compgen -W "filesystem github postgres sqlite brave puppeteer git memory bitbucket" -- ${cur}) )\n' +
        "                        return 0\n" +
        "                    fi\n" +
        "                    ;;\n" +
        "                *)\n" +
        "                    if [[ ${COMP_CWORD} -eq 2 ]]; then\n" +
        '                        opts="list install add test exec remove"\n' +
        '                        COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )\n' +
        "                        return 0\n" +
        "                    fi\n" +
        "                    ;;\n" +
        "            esac\n" +
        "            ;;\n" +
        "        provider)\n" +
        "            if [[ ${COMP_CWORD} -eq 2 ]]; then\n" +
        '                COMPREPLY=( $(compgen -W "status" -- ${cur}) )\n' +
        "                return 0\n" +
        "            fi\n" +
        "            ;;\n" +
        "        models)\n" +
        "            if [[ ${COMP_CWORD} -eq 2 ]]; then\n" +
        '                COMPREPLY=( $(compgen -W "list test" -- ${cur}) )\n' +
        "                return 0\n" +
        "            fi\n" +
        "            ;;\n" +
        "        config)\n" +
        "            if [[ ${COMP_CWORD} -eq 2 ]]; then\n" +
        '                COMPREPLY=( $(compgen -W "init show validate reset export" -- ${cur}) )\n' +
        "                return 0\n" +
        "            fi\n" +
        "            ;;\n" +
        "        memory)\n" +
        "            if [[ ${COMP_CWORD} -eq 2 ]]; then\n" +
        '                COMPREPLY=( $(compgen -W "stats history clear" -- ${cur}) )\n' +
        "                return 0\n" +
        "            fi\n" +
        "            ;;\n" +
        "        *)\n" +
        "            # Global options for all commands\n" +
        '            opts="--help --version --debug --quiet --noColor --configFile"\n' +
        '            COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )\n' +
        "            return 0\n" +
        "            ;;\n" +
        "    esac\n\n" +
        "    # File completion for certain options\n" +
        '    case "${prev}" in\n' +
        "        --output|-o|--configFile)\n" +
        "            COMPREPLY=( $(compgen -f -- ${cur}) )\n" +
        "            return 0\n" +
        "            ;;\n" +
        "        batch)\n" +
        "            COMPREPLY=( $(compgen -f -- ${cur}) )\n" +
        "            return 0\n" +
        "            ;;\n" +
        "    esac\n\n" +
        "    return 0\n" +
        "}\n\n" +
        "# Register the completion function\n" +
        "complete -F _neurolink_completion neurolink\n\n" +
        "# Zsh completion (if running zsh)\n" +
        'if [[ -n "${ZSH_VERSION}" ]]; then\n' +
        "    autoload -U +X bashcompinit && bashcompinit\n" +
        "    complete -F _neurolink_completion neurolink\n" +
        "fi\n\n" +
        'echo "NeuroLink CLI completion script loaded successfully!"\n' +
        'echo "Available commands: generate, stream, batch, provider, status, models, mcp, discover, config, get-best-provider, completion"';

      // Handle output options
      if (argv.output) {
        const fs = await import("fs");
        fs.writeFileSync(argv.output, completionScript);
        if (!argv.quiet) {
          logger.always(`✅ Completion script saved to ${argv.output}`);
          logger.always(`💡 Run: source ${argv.output}`);
        }
      } else {
        logger.always(completionScript);
      }

      if (!argv.quiet) {
        logger.always(chalk.blue("\n📋 Installation Instructions:"));
        logger.always("1. Save the output to a file:");
        logger.always("   neurolink completion > ~/.neurolink-completion.sh");
        logger.always("2. Add to your shell profile:");
        logger.always(
          "   echo 'source ~/.neurolink-completion.sh' >> ~/.bashrc",
        );
        logger.always("3. Restart your shell or run:");
        logger.always("   source ~/.bashrc");
        logger.always(
          chalk.green("\n🎉 Then enjoy tab completion for NeuroLink commands!"),
        );
      }
    } catch (error) {
      handleError(error as Error, "Completion generation");
    }
  }

  /**
   * Flush Langfuse traces before exit
   */
  private static async flushLangfuseTraces(): Promise<void> {
    try {
      logger.debug("[CLI] Flushing Langfuse traces before exit...");
      const { flushOpenTelemetry } =
        await import("../../lib/services/server/ai/observability/instrumentation.js");
      await flushOpenTelemetry();
      logger.debug("[CLI] Langfuse traces flushed successfully");
    } catch (error) {
      logger.error("[CLI] Error flushing Langfuse traces", { error });
    }
  }
}
