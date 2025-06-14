import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createAIProvider, getBestProvider } from "@juspay/neurolink";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

// In-memory storage for demo purposes
const usageStats = {
  requests: 0,
  providers: {},
  errors: 0,
  totalTokens: 0,
};

// Helper function to log requests and update stats
const logRequest = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  usageStats.requests++;
  next();
};

app.use(logRequest);

// Helper functions
function getModelForProvider(provider) {
  switch (provider) {
    case "openai":
      return process.env.OPENAI_MODEL || "gpt-4";
    case "bedrock":
      return (
        process.env.BEDROCK_MODEL ||
        "arn:aws:bedrock:us-east-2:225681119357:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0"
      );
    case "vertex":
      return process.env.VERTEX_MODEL || "gemini-1.5-pro";
    default:
      return "gpt-4";
  }
}

function isProviderConfigured(provider) {
  switch (provider) {
    case "openai":
      return !!process.env.OPENAI_API_KEY;
    case "bedrock":
      return !!(
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      );
    case "vertex":
      return !!(
        process.env.GOOGLE_VERTEX_PROJECT ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.GOOGLE_AUTH_CLIENT_EMAIL
      );
    default:
      return false;
  }
}

// API endpoint to check provider status
app.get("/api/status", async (req, res) => {
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

  // Test each provider
  const providers = ["openai", "bedrock", "vertex"];

  for (const providerName of providers) {
    try {
      const provider = await createAIProvider(providerName);
      status.providers[providerName] = {
        available: true,
        model: getModelForProvider(providerName),
        configured: isProviderConfigured(providerName),
      };
    } catch (error) {
      status.providers[providerName] = {
        available: false,
        error: error.message,
        configured: isProviderConfigured(providerName),
      };
    }
  }

  try {
    status.bestProvider = await getBestProvider();
  } catch (error) {
    status.bestProvider = { error: error.message };
  }

  res.json(status);
});

// API endpoint for text generation
app.post("/api/generate", async (req, res) => {
  const { provider = "auto", prompt } = req.body;

  if (!prompt) {
    return res
      .status(400)
      .json({ success: false, error: "Prompt is required" });
  }

  try {
    console.log(
      `[Generate] Using provider: ${provider}, prompt length: ${prompt.length}`,
    );

    let aiProvider;
    if (provider === "auto") {
      const bestProviderName = await getBestProvider();
      console.log(`[Generate] Selected provider: ${bestProviderName}`);
      aiProvider = await createAIProvider(bestProviderName);
    } else {
      aiProvider = await createAIProvider(provider);
    }

    const startTime = Date.now();
    const result = await aiProvider.generateText({
      prompt,
      model: getModelForProvider(provider),
      maxTokens: 500,
      temperature: 0.7,
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    if (!result || !result.text) {
      throw new Error("Provider returned null or invalid response");
    }

    // Update usage stats
    if (result.usage) {
      usageStats.totalTokens += result.usage.totalTokens || 0;
    }

    console.log(`[Generate] Success in ${responseTime}ms`);

    res.json({
      success: true,
      content: result.text,
      provider: provider === "auto" ? "auto-selected" : provider,
      model: result.model || getModelForProvider(provider),
      responseTime: responseTime,
      usage: result.usage,
    });
  } catch (error) {
    console.error(`[Generate] Error:`, error.message);
    usageStats.errors++;
    res.status(500).json({
      success: false,
      error: error.message,
      provider,
    });
  }
});

// API endpoint for schema validation testing
app.post("/api/schema", async (req, res) => {
  try {
    const { type } = req.body;
    const bestProviderName = await getBestProvider();
    console.log(`[Schema] Selected provider: ${bestProviderName}`);
    const provider = await createAIProvider(bestProviderName);

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

    const result = await provider.generateText({
      prompt: selectedSchema.prompt,
      model: getModelForProvider(bestProviderName),
      maxTokens: 400,
      temperature: 0.7,
      schema: selectedSchema.schema,
    });

    res.json({
      success: true,
      structuredData: result.object || JSON.parse(result.text),
      rawText: result.text,
      provider: bestProviderName,
      usage: result.usage,
      schema: selectedSchema.schema,
    });
  } catch (error) {
    console.error("[Schema] Error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// API endpoint for performance benchmark
app.post("/api/benchmark", async (req, res) => {
  const testPrompt = "Write a haiku about artificial intelligence.";
  const results = {
    timestamp: new Date().toISOString(),
    prompt: testPrompt,
    results: {},
  };

  const providers = ["openai", "bedrock", "vertex"];

  for (const providerName of providers) {
    try {
      console.log(`[Benchmark] Testing ${providerName}`);

      const startTime = Date.now();
      const provider = await createAIProvider(providerName);
      const result = await provider.generateText({
        prompt: testPrompt,
        model: getModelForProvider(providerName),
        maxTokens: 100,
        temperature: 0.7,
      });
      const endTime = Date.now();

      results.results[providerName] = {
        success: true,
        responseTime: endTime - startTime,
        model: result.model || getModelForProvider(providerName),
        usage: result.usage,
        contentLength: result.text.length,
        content: result.text,
      };
    } catch (error) {
      results.results[providerName] = {
        success: false,
        error: error.message,
      };
    }
  }

  res.json(results);
});

// Business Use Cases - Email Generator
app.post("/api/business/email", async (req, res) => {
  try {
    const { type, context } = req.body;
    const provider = await createAIProvider(await getBestProvider());

    const prompts = {
      marketing: `Write a professional marketing email about: ${context}. Include a compelling subject line, engaging body text, and clear call-to-action.`,
      support: `Write a helpful customer support email response for: ${context}. Be empathetic, solution-focused, and professional.`,
      "follow-up": `Write a polite follow-up email regarding: ${context}. Be courteous, specific about next steps, and include timeline.`,
    };

    const result = await provider.generateText({
      prompt: prompts[type] || prompts.marketing,
      maxTokens: 400,
      temperature: 0.7,
    });

    res.json({
      success: true,
      content: result.text,
      usage: result.usage,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Business Use Cases - Data Analysis
app.post("/api/business/analyze-data", async (req, res) => {
  try {
    const { data } = req.body;
    const provider = await createAIProvider(await getBestProvider());

    const result = await provider.generateText({
      prompt: `Analyze this CSV data and provide insights, trends, and recommendations:

${data}

Please provide:
1. Key insights and patterns
2. Statistical observations
3. Business recommendations
4. Potential areas for improvement`,
      maxTokens: 600,
      temperature: 0.3,
    });

    res.json({
      success: true,
      content: result.text,
      usage: result.usage,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Business Use Cases - Document Summarizer
app.post("/api/business/summarize", async (req, res) => {
  try {
    const { text, length } = req.body;
    const provider = await createAIProvider(await getBestProvider());

    const prompts = {
      brief: `Summarize this text in 1-2 concise sentences: ${text}`,
      medium: `Provide a comprehensive paragraph summary of this text: ${text}`,
      detailed: `Create a detailed summary with key points, main ideas, and important details: ${text}`,
    };

    const result = await provider.generateText({
      prompt: prompts[length] || prompts.medium,
      maxTokens: length === "brief" ? 100 : length === "detailed" ? 400 : 200,
      temperature: 0.4,
    });

    res.json({
      success: true,
      content: result.text,
      usage: result.usage,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Creative Tools - Creative Writing
app.post("/api/creative/writing", async (req, res) => {
  try {
    const { type, prompt } = req.body;
    const provider = await createAIProvider(await getBestProvider());

    const systemPrompts = {
      story: `You are a creative writer. Write an engaging short story based on: ${prompt}. Include vivid descriptions, character development, and a compelling narrative arc.`,
      poem: `You are a poet. Create a beautiful, evocative poem inspired by: ${prompt}. Use imagery, rhythm, and emotional depth.`,
      dialogue: `You are a screenwriter. Write realistic, engaging dialogue between characters in this scenario: ${prompt}. Make it natural and character-driven.`,
    };

    const result = await provider.generateText({
      prompt: systemPrompts[type] || systemPrompts.story,
      maxTokens: 500,
      temperature: 0.8,
    });

    res.json({
      success: true,
      content: result.text,
      usage: result.usage,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Creative Tools - Language Translation
app.post("/api/creative/translate", async (req, res) => {
  try {
    const { text, language } = req.body;
    const provider = await createAIProvider(await getBestProvider());

    const result = await provider.generateText({
      prompt: `Translate the following text to ${language}, maintaining tone and context:

"${text}"

Provide only the translation:`,
      maxTokens: 300,
      temperature: 0.3,
    });

    res.json({
      success: true,
      content: result.text.trim(),
      usage: result.usage,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Creative Tools - Content Ideas Generator
app.post("/api/creative/ideas", async (req, res) => {
  try {
    const { type, topic } = req.body;
    const provider = await createAIProvider(await getBestProvider());

    const prompts = {
      blog: `Generate 10 compelling blog post ideas about ${topic}. Include catchy titles and brief descriptions for each.`,
      social: `Create 10 engaging social media post ideas about ${topic}. Include platform-specific suggestions and hashtag recommendations.`,
      video: `Generate 10 video content ideas about ${topic}. Include concept, target audience, and key talking points for each.`,
    };

    const result = await provider.generateText({
      prompt: prompts[type] || prompts.blog,
      maxTokens: 500,
      temperature: 0.7,
    });

    res.json({
      success: true,
      content: result.text,
      usage: result.usage,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Developer Tools - Code Generator
app.post("/api/developer/code", async (req, res) => {
  try {
    const { language, description } = req.body;
    const provider = await createAIProvider(await getBestProvider());

    const result = await provider.generateText({
      prompt: `Generate clean, well-commented ${language} code for: ${description}

Requirements:
- Follow best practices for ${language}
- Include proper error handling
- Add clear comments explaining the logic
- Make it production-ready

Code:`,
      maxTokens: 600,
      temperature: 0.4,
    });

    res.json({
      success: true,
      content: result.text,
      usage: result.usage,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Developer Tools - API Documentation Generator
app.post("/api/developer/api-doc", async (req, res) => {
  try {
    const { description } = req.body;
    const provider = await createAIProvider(await getBestProvider());

    const result = await provider.generateText({
      prompt: `Create comprehensive API documentation for: ${description}

Include:
- Endpoint descriptions
- Request/response examples
- Parameter definitions
- Error codes and messages
- Authentication requirements
- Usage examples in multiple languages

Documentation:`,
      maxTokens: 800,
      temperature: 0.3,
    });

    res.json({
      success: true,
      content: result.text,
      usage: result.usage,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Developer Tools - Debug Helper
app.post("/api/developer/debug", async (req, res) => {
  try {
    const { error } = req.body;
    const provider = await createAIProvider(await getBestProvider());

    const result = await provider.generateText({
      prompt: `Analyze this error and provide debugging help:

${error}

Please provide:
1. Explanation of what the error means
2. Most likely causes
3. Step-by-step debugging approach
4. Code examples of potential fixes
5. Best practices to prevent similar issues

Analysis:`,
      maxTokens: 600,
      temperature: 0.4,
    });

    res.json({
      success: true,
      content: result.text,
      usage: result.usage,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Usage Analytics
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

// Enhanced demo page with complete interactive interface
app.get("/", (req, res) => {
  res.sendFile("demo-page.html", { root: __dirname });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("[Server Error]:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: error.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🧠 NeuroLink Demo Server running at http://localhost:${PORT}`);
  console.log("");
  console.log("📋 Available endpoints:");
  console.log("  GET  /           - Demo web interface");
  console.log("  GET  /api/status - Provider status check");
  console.log("  POST /api/generate - Text generation");
  console.log("  POST /api/schema - Schema validation test");
  console.log("  POST /api/benchmark - Performance benchmark");
  console.log("  POST /api/business/* - Business use cases");
  console.log("  POST /api/creative/* - Creative tools");
  console.log("  POST /api/developer/* - Developer tools");
  console.log("  GET  /api/analytics - Usage analytics");
  console.log("");
  console.log("🔧 Configuration check:");
  console.log(
    `  OpenAI: ${isProviderConfigured("openai") ? "✅ Configured" : "❌ Missing API key"}`,
  );
  console.log(
    `  Bedrock: ${isProviderConfigured("bedrock") ? "✅ Configured" : "❌ Missing AWS credentials"}`,
  );
  console.log(
    `  Vertex AI: ${isProviderConfigured("vertex") ? "✅ Configured" : "❌ Missing Google credentials"}`,
  );
});
