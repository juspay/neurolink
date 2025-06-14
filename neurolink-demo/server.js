/**
 * NeuroLink AI Development Platform Demo Server
 *
 * A comprehensive Express.js server showcasing NeuroLink's capabilities:
 * - 9 AI providers (OpenAI, Anthropic, AWS Bedrock, Google Vertex AI, Google AI Studio, Azure OpenAI, Hugging Face, Ollama, Mistral AI)
 * - 10 specialized MCP tools for AI development workflow
 * - Business use cases, creative tools, and developer utilities
 * - Real-time provider status monitoring and benchmarking
 * - Interactive web interface for testing all features
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createAIProvider, getBestProvider } from "neurolink";

// ================================
// CONFIGURATION & CONSTANTS
// ================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Server configuration
const app = express();
const PORT = process.env.PORT || 9876;

// All supported AI providers - single source of truth
// Updated priority order: Gemini (Google AI) first as primary provider
const ALL_PROVIDERS = [
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
const DEFAULT_MODELS = {
  openai: "gpt-4o",
  bedrock:
    "arn:aws:bedrock:us-east-2:225681119357:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0",
  vertex: "gemini-1.5-pro",
  "google-ai": "gemini-1.5-pro-latest",
  anthropic: "claude-3-5-sonnet-20241022",
  azure: "gpt-4o",
  huggingface: "microsoft/DialoGPT-medium",
  ollama: "llama3.2:latest",
  mistral: "mistral-small",
};

// Environment variable mappings for provider configuration
const PROVIDER_ENV_VARS = {
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
  ollama: [], // No API key required for local Ollama
  mistral: ["MISTRAL_API_KEY"],
};

// Common generation parameters
const DEFAULT_GENERATION_PARAMS = {
  maxTokens: 500,
  temperature: 0.7,
};

// ================================
// MIDDLEWARE & UTILITIES
// ================================

// Express middleware setup
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

// In-memory usage statistics
const usageStats = {
  requests: 0,
  providers: {},
  errors: 0,
  totalTokens: 0,
};

/**
 * Request logging middleware
 * Logs all incoming requests and updates usage statistics
 */
const logRequest = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  usageStats.requests++;
  next();
};

app.use(logRequest);

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Get the configured model for a specific provider
 * @param {string} provider - Provider name
 * @returns {string} Model identifier
 */
function getModelForProvider(provider) {
  const envVar = `${provider.toUpperCase().replace("-", "_")}_MODEL`;
  return (
    process.env[envVar] || DEFAULT_MODELS[provider] || DEFAULT_MODELS.openai
  );
}

/**
 * Check if a provider is properly configured
 * @param {string} provider - Provider name
 * @returns {boolean} True if provider has required configuration
 */
function isProviderConfigured(provider) {
  if (provider === "ollama") {
    return true;
  } // Always available if installed

  const requiredVars = PROVIDER_ENV_VARS[provider] || [];

  // Check if at least one required variable is set (for providers with multiple auth methods)
  if (provider === "vertex") {
    return requiredVars.some((varName) => !!process.env[varName]);
  }

  // For most providers, all required variables must be set
  return requiredVars.every((varName) => !!process.env[varName]);
}

/**
 * Create a standardized success response
 * @param {*} data - Response data
 * @param {Object} metadata - Additional metadata (usage, timing, etc.)
 * @returns {Object} Formatted response
 */
function createSuccessResponse(data, metadata = {}) {
  return {
    success: true,
    ...data,
    ...metadata,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a standardized error response
 * @param {string} error - Error message
 * @param {Object} context - Additional error context
 * @returns {Object} Formatted error response
 */
function createErrorResponse(error, context = {}) {
  return {
    success: false,
    error: error,
    ...context,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle async route errors
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped route handler with error handling
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Update usage statistics with token information
 * @param {Object} usage - Usage data from AI provider
 */
function updateUsageStats(usage) {
  if (usage && usage.totalTokens) {
    usageStats.totalTokens += usage.totalTokens;
  }
}

/**
 * Test a single provider's availability
 * @param {string} providerName - Name of the provider to test
 * @returns {Object} Provider status information
 */
async function testProviderAvailability(providerName) {
  try {
    const provider = await createAIProvider(providerName);
    return {
      available: true,
      model: getModelForProvider(providerName),
      configured: isProviderConfigured(providerName),
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
      configured: isProviderConfigured(providerName),
    };
  }
}

/**
 * Generate AI content with standardized parameters and automatic fallback
 * @param {string} providerName - Provider to use ('auto' for smart fallback)
 * @param {string} prompt - Text prompt
 * @param {Object} options - Generation options
 * @returns {Object} Generation result with timing and usage info
 */
async function generateWithProvider(providerName, prompt, options = {}) {
  const startTime = Date.now();

  // Determine provider list to try
  let providersToTry = [];

  if (providerName === "auto") {
    // Use all providers in priority order for automatic fallback
    providersToTry = ALL_PROVIDERS.filter((p) => isProviderConfigured(p));
    console.log(
      `[Generate] Auto mode: Will try providers in order: ${providersToTry.join(", ")}`,
    );
  } else {
    // For specific provider, try it first, then fallback to others if enabled
    providersToTry = [providerName];
    if (process.env.ENABLE_FALLBACK !== "false") {
      const fallbackProviders = ALL_PROVIDERS.filter(
        (p) => p !== providerName && isProviderConfigured(p),
      );
      providersToTry = [...providersToTry, ...fallbackProviders];
      console.log(
        `[Generate] Fallback enabled: Will try ${providerName} first, then: ${fallbackProviders.join(", ")}`,
      );
    }
  }

  const errors = [];

  // Try each provider in sequence until one succeeds
  for (let i = 0; i < providersToTry.length; i++) {
    const currentProvider = providersToTry[i];

    try {
      console.log(
        `[Generate] Attempting provider: ${currentProvider} (${i + 1}/${providersToTry.length})`,
      );

      const aiProvider = await createAIProvider(currentProvider);
      const result = await aiProvider.generateText({
        prompt,
        model: getModelForProvider(currentProvider),
        maxTokens: options.maxTokens || DEFAULT_GENERATION_PARAMS.maxTokens,
        temperature:
          options.temperature || DEFAULT_GENERATION_PARAMS.temperature,
        ...options,
      });

      const responseTime = Date.now() - startTime;

      if (!result || !result.text) {
        throw new Error("Provider returned null or invalid response");
      }

      // Update global usage statistics
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
      const errorMsg = error.message || String(error);
      errors.push(`${currentProvider}: ${errorMsg}`);

      console.log(`[Generate] ${currentProvider} failed: ${errorMsg}`);

      // If this is the last provider, throw the accumulated errors
      if (i === providersToTry.length - 1) {
        const finalError = `Failed after ${providersToTry.length} attempts. Last error: ${errorMsg}`;
        console.error(
          `[Generate] All providers failed. Errors: ${errors.join("; ")}`,
        );
        throw new Error(finalError);
      }

      // Continue to next provider
      console.log(`[Generate] Trying next provider...`);
    }
  }
}

/**
 * Generate mock AI analysis data for demonstration
 * @param {string} toolName - Name of the analysis tool
 * @param {Object} params - Tool parameters
 * @returns {Object} Mock analysis result
 */
function generateMockAnalysisData(toolName, params = {}) {
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

    "optimize-prompt-parameters": {
      originalPrompt: params.prompt,
      optimizedParameters: {
        temperature:
          params.style === "creative"
            ? 0.9
            : params.style === "precise"
              ? 0.3
              : 0.7,
        maxTokens:
          params.optimizeFor === "speed"
            ? 250
            : params.optimizeFor === "cost"
              ? 300
              : 500,
        topP: 0.9,
        frequencyPenalty: 0.1,
      },
      expectedImprovements: {
        qualityIncrease: "15%",
        costReduction: params.optimizeFor === "cost" ? "23%" : "5%",
        speedImprovement: params.optimizeFor === "speed" ? "35%" : "8%",
      },
      optimizedPrompt: `${params.prompt}\n\nPlease ensure your response is ${params.style === "creative" ? "creative and engaging" : params.style === "precise" ? "precise and factual" : "well-balanced"}.`,
      recommendations: [
        `Temperature optimized for ${params.style || "balanced"} style`,
        `Token limit set for ${params.optimizeFor || "quality"} optimization`,
        "Consider A/B testing these parameters",
      ],
    },
  };

  return mockData[toolName] || {};
}

// ================================
// CORE API ENDPOINTS
// ================================

/**
 * GET /api/status
 * Check the status and availability of all AI providers
 */
app.get(
  "/api/status",
  asyncHandler(async (req, res) => {
    const status = {
      timestamp: new Date().toISOString(),
      providers: {},
      bestProvider: null,
      configuration: {
        defaultProvider: process.env.DEFAULT_PROVIDER || "openai",
        streamingEnabled: process.env.ENABLE_STREAMING === "true",
        fallbackEnabled: process.env.ENABLE_FALLBACK === "true",
      },
    };

    // Test each provider's availability
    for (const providerName of ALL_PROVIDERS) {
      status.providers[providerName] =
        await testProviderAvailability(providerName);
    }

    // Get the best available provider
    try {
      status.bestProvider = await getBestProvider();
    } catch (error) {
      status.bestProvider = { error: error.message };
    }

    res.json(status);
  }),
);

/**
 * POST /api/generate
 * Generate text using a specified or auto-selected AI provider
 */
app.post(
  "/api/generate",
  asyncHandler(async (req, res) => {
    const { provider = "auto", prompt } = req.body;

    if (!prompt) {
      return res.status(400).json(createErrorResponse("Prompt is required"));
    }

    console.log(
      `[Generate] Using provider: ${provider}, prompt length: ${prompt.length}`,
    );

    try {
      const result = await generateWithProvider(provider, prompt);

      console.log(`[Generate] Success in ${result.responseTime}ms`);
      res.json(createSuccessResponse(result));
    } catch (error) {
      console.error(`[Generate] Error:`, error.message);
      usageStats.errors++;
      res.status(500).json(createErrorResponse(error.message, { provider }));
    }
  }),
);

/**
 * POST /api/schema
 * Test structured output generation with JSON schemas
 */
app.post(
  "/api/schema",
  asyncHandler(async (req, res) => {
    const { type = "user-profile" } = req.body;

    // Pre-defined schemas for different content types
    const schemas = {
      "user-profile": {
        prompt:
          "Generate a user profile for a fictional character including name, age, occupation, and hobbies.",
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
          "Generate a product review for a smartphone including rating, pros, cons, and recommendation.",
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
          "Generate meeting notes for a project planning session including attendees, decisions, and action items.",
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

    const selectedSchema = schemas[type] || schemas["user-profile"];

    console.log(`[Schema] Testing structured output for type: ${type}`);

    try {
      const result = await generateWithProvider("auto", selectedSchema.prompt, {
        maxTokens: 400,
        schema: selectedSchema.schema,
      });

      res.json(
        createSuccessResponse({
          structuredData: result.object || JSON.parse(result.content),
          rawText: result.content,
          provider: result.provider,
          usage: result.usage,
          schema: selectedSchema.schema,
        }),
      );
    } catch (error) {
      console.error("[Schema] Error:", error.message);
      res.status(500).json(createErrorResponse(error.message));
    }
  }),
);

/**
 * POST /api/benchmark
 * Benchmark performance across all available AI providers
 */
app.post(
  "/api/benchmark",
  asyncHandler(async (req, res) => {
    const testPrompt = "Write a haiku about artificial intelligence.";
    const results = {
      timestamp: new Date().toISOString(),
      prompt: testPrompt,
      results: {},
    };

    console.log("[Benchmark] Testing all providers with standardized prompt");

    // Test each provider sequentially
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
        console.error(`[Benchmark] ${providerName} failed:`, error.message);
        results.results[providerName] = {
          success: false,
          error: error.message,
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
  asyncHandler(async (req, res) => {
    const { type = "marketing", context } = req.body;

    const emailPrompts = {
      marketing: `Write a professional marketing email about: ${context}. Include a compelling subject line, engaging body text, and clear call-to-action.`,
      support: `Write a helpful customer support email response for: ${context}. Be empathetic, solution-focused, and professional.`,
      "follow-up": `Write a polite follow-up email regarding: ${context}. Be courteous, specific about next steps, and include timeline.`,
    };

    const result = await generateWithProvider(
      "auto",
      emailPrompts[type] || emailPrompts.marketing,
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
  asyncHandler(async (req, res) => {
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
  asyncHandler(async (req, res) => {
    const { text, length = "medium" } = req.body;

    const summaryPrompts = {
      brief: `Summarize this text in 1-2 concise sentences: ${text}`,
      medium: `Provide a comprehensive paragraph summary of this text: ${text}`,
      detailed: `Create a detailed summary with key points, main ideas, and important details: ${text}`,
    };

    const tokenLimits = { brief: 100, medium: 200, detailed: 400 };

    const result = await generateWithProvider("auto", summaryPrompts[length], {
      maxTokens: tokenLimits[length],
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
// CREATIVE TOOLS ENDPOINTS
// ================================

/**
 * POST /api/creative/writing
 * Generate creative content (stories, poems, dialogue)
 */
app.post(
  "/api/creative/writing",
  asyncHandler(async (req, res) => {
    const { type = "story", prompt } = req.body;

    const creativePrompts = {
      story: `You are a creative writer. Write an engaging short story based on: ${prompt}. Include vivid descriptions, character development, and a compelling narrative arc.`,
      poem: `You are a poet. Create a beautiful, evocative poem inspired by: ${prompt}. Use imagery, rhythm, and emotional depth.`,
      dialogue: `You are a screenwriter. Write realistic, engaging dialogue between characters in this scenario: ${prompt}. Make it natural and character-driven.`,
    };

    const result = await generateWithProvider("auto", creativePrompts[type], {
      maxTokens: 500,
      temperature: 0.8,
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
 * POST /api/creative/translate
 * Translate text while maintaining tone and context
 */
app.post(
  "/api/creative/translate",
  asyncHandler(async (req, res) => {
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
  asyncHandler(async (req, res) => {
    const { type = "blog", topic } = req.body;

    const ideaPrompts = {
      blog: `Generate 10 compelling blog post ideas about ${topic}. Include catchy titles and brief descriptions for each.`,
      social: `Create 10 engaging social media post ideas about ${topic}. Include platform-specific suggestions and hashtag recommendations.`,
      video: `Generate 10 video content ideas about ${topic}. Include concept, target audience, and key talking points for each.`,
    };

    const result = await generateWithProvider("auto", ideaPrompts[type], {
      maxTokens: 500,
      temperature: 0.7,
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
// DEVELOPER TOOLS ENDPOINTS
// ================================

/**
 * POST /api/developer/code
 * Generate clean, production-ready code
 */
app.post(
  "/api/developer/code",
  asyncHandler(async (req, res) => {
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
  asyncHandler(async (req, res) => {
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
  asyncHandler(async (req, res) => {
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
// ANALYTICS ENDPOINT
// ================================

/**
 * GET /api/analytics
 * Get current usage statistics and analytics
 */
app.get("/api/analytics", (req, res) => {
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
} from "./mcp-helpers.js";

/**
 * GET /api/mcp/servers
 * List all configured MCP servers with their status
 */
app.get(
  "/api/mcp/servers",
  asyncHandler(async (req, res) => {
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
  asyncHandler(async (req, res) => {
    const { serverName } = req.body;

    if (!serverName) {
      return res
        .status(400)
        .json(createErrorResponse("Server name is required"));
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
  asyncHandler(async (req, res) => {
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
  asyncHandler(async (req, res) => {
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
  asyncHandler(async (req, res) => {
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
  asyncHandler(async (req, res) => {
    const { serverName, toolName, params = {} } = req.body;

    if (!serverName || !toolName) {
      return res
        .status(400)
        .json(createErrorResponse("Server name and tool name are required"));
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
  asyncHandler(async (req, res) => {
    const { name, command, args, env } = req.body;

    if (!name || !command) {
      return res
        .status(400)
        .json(createErrorResponse("Server name and command are required"));
    }

    console.log(`[MCP] Adding custom server: ${name}`);
    const result = addCustomMCPServer(name, command, args, env);

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
  asyncHandler(async (req, res) => {
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
  asyncHandler(async (req, res) => {
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
  asyncHandler(async (req, res) => {
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
  asyncHandler(async (req, res) => {
    const { prompt, style = "balanced", optimizeFor = "quality" } = req.body;

    if (!prompt) {
      return res.status(400).json(createErrorResponse("Prompt is required"));
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
  asyncHandler(async (req, res) => {
    const {
      codeFunction,
      testTypes = ["unit", "integration", "edge-cases"],
      framework = "jest",
    } = req.body;

    if (!codeFunction) {
      return res
        .status(400)
        .json(createErrorResponse("Code function is required"));
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
  asyncHandler(async (req, res) => {
    const { code, language, goals = ["readability", "performance"] } = req.body;

    if (!code) {
      return res.status(400).json(createErrorResponse("Code is required"));
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
  asyncHandler(async (req, res) => {
    const { code, language, docType = "api" } = req.body;

    if (!code) {
      return res.status(400).json(createErrorResponse("Code is required"));
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
  asyncHandler(async (req, res) => {
    const { aiOutput, expectedResult, analysisType = "quality" } = req.body;

    if (!aiOutput) {
      return res.status(400).json(createErrorResponse("AI output is required"));
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
app.use((error, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.path}:`, error);

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
});

/**
 * 404 handler for unknown routes
 */
app.use("*", (req, res) => {
  res.status(404).json(
    createErrorResponse(`Route not found: ${req.method} ${req.originalUrl}`, {
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
