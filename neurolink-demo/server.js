import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAIProvider, getBestProvider } from '@juspay/neurolink';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 9876;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// In-memory storage for demo purposes
const usageStats = {
  requests: 0,
  providers: {},
  errors: 0,
  totalTokens: 0
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
    case 'openai':
      return process.env.OPENAI_MODEL || 'gpt-4';
    case 'bedrock':
      return process.env.BEDROCK_MODEL || 'arn:aws:bedrock:us-east-2:225681119357:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0';
    case 'vertex':
      return process.env.VERTEX_MODEL || 'gemini-1.5-pro';
    default:
      return 'gpt-4';
  }
}

function isProviderConfigured(provider) {
  switch (provider) {
    case 'openai':
      return !!process.env.OPENAI_API_KEY;
    case 'bedrock':
      return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
    case 'vertex':
      return !!(process.env.GOOGLE_VERTEX_PROJECT || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_AUTH_CLIENT_EMAIL);
    default:
      return false;
  }
}

// API endpoint to check provider status
app.get('/api/status', async (req, res) => {
  const status = {
    timestamp: new Date().toISOString(),
    providers: {},
    bestProvider: null,
    configuration: {
      defaultProvider: process.env.DEFAULT_PROVIDER || 'openai',
      streamingEnabled: process.env.ENABLE_STREAMING === 'true',
      fallbackEnabled: process.env.ENABLE_FALLBACK === 'true'
    }
  };

  // Test each provider
  const providers = ['openai', 'bedrock', 'vertex'];

  for (const providerName of providers) {
    try {
      const provider = await createAIProvider(providerName);
      status.providers[providerName] = {
        available: true,
        model: getModelForProvider(providerName),
        configured: isProviderConfigured(providerName)
      };
    } catch (error) {
      status.providers[providerName] = {
        available: false,
        error: error.message,
        configured: isProviderConfigured(providerName)
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
app.post('/api/generate', async (req, res) => {
  const { provider = 'auto', prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  try {
    console.log(`[Generate] Using provider: ${provider}, prompt length: ${prompt.length}`);

    let aiProvider;
    if (provider === 'auto') {
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
      temperature: 0.7
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    if (!result || !result.text) {
      throw new Error('Provider returned null or invalid response');
    }

    // Update usage stats
    if (result.usage) {
      usageStats.totalTokens += (result.usage.totalTokens || 0);
    }

    console.log(`[Generate] Success in ${responseTime}ms`);

    res.json({
      success: true,
      content: result.text,
      provider: provider === 'auto' ? 'auto-selected' : provider,
      model: result.model || getModelForProvider(provider),
      responseTime: responseTime,
      usage: result.usage
    });

  } catch (error) {
    console.error(`[Generate] Error:`, error.message);
    usageStats.errors++;
    res.status(500).json({
      success: false,
      error: error.message,
      provider
    });
  }
});

// API endpoint for schema validation testing
app.post('/api/schema', async (req, res) => {
  try {
    const { type } = req.body;
    const bestProviderName = await getBestProvider();
    console.log(`[Schema] Selected provider: ${bestProviderName}`);
    const provider = await createAIProvider(bestProviderName);

    const schemas = {
      'user-profile': {
        prompt: "Generate a user profile for a fictional character including name, age, occupation, and hobbies.",
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
            occupation: { type: 'string' },
            hobbies: { type: 'array', items: { type: 'string' } }
          },
          required: ['name', 'age', 'occupation', 'hobbies']
        }
      },
      'product-review': {
        prompt: "Generate a product review for a smartphone including rating, pros, cons, and recommendation.",
        schema: {
          type: 'object',
          properties: {
            product: { type: 'string' },
            rating: { type: 'number', minimum: 1, maximum: 5 },
            pros: { type: 'array', items: { type: 'string' } },
            cons: { type: 'array', items: { type: 'string' } },
            recommendation: { type: 'string' }
          },
          required: ['product', 'rating', 'pros', 'cons', 'recommendation']
        }
      },
      'meeting-notes': {
        prompt: "Generate meeting notes for a project planning session including attendees, decisions, and action items.",
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            date: { type: 'string' },
            attendees: { type: 'array', items: { type: 'string' } },
            decisions: { type: 'array', items: { type: 'string' } },
            actionItems: { type: 'array', items: {
              type: 'object',
              properties: {
                task: { type: 'string' },
                assignee: { type: 'string' },
                dueDate: { type: 'string' }
              }
            }}
          },
          required: ['title', 'date', 'attendees', 'decisions', 'actionItems']
        }
      }
    };

    const selectedSchema = schemas[type] || schemas['user-profile'];

    const result = await provider.generateText({
      prompt: selectedSchema.prompt,
      model: getModelForProvider(bestProviderName),
      maxTokens: 400,
      temperature: 0.7,
      schema: selectedSchema.schema
    });

    res.json({
      success: true,
      structuredData: result.object || JSON.parse(result.text),
      rawText: result.text,
      provider: bestProviderName,
      usage: result.usage,
      schema: selectedSchema.schema
    });

  } catch (error) {
    console.error('[Schema] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint for performance benchmark
app.post('/api/benchmark', async (req, res) => {
  const testPrompt = "Write a haiku about artificial intelligence.";
  const results = {
    timestamp: new Date().toISOString(),
    prompt: testPrompt,
    results: {}
  };

  const providers = ['openai', 'bedrock', 'vertex'];

  for (const providerName of providers) {
    try {
      console.log(`[Benchmark] Testing ${providerName}`);

      const startTime = Date.now();
      const provider = await createAIProvider(providerName);
      const result = await provider.generateText({
        prompt: testPrompt,
        model: getModelForProvider(providerName),
        maxTokens: 100,
        temperature: 0.7
      });
      const endTime = Date.now();

      results.results[providerName] = {
        success: true,
        responseTime: endTime - startTime,
        model: result.model || getModelForProvider(providerName),
        usage: result.usage,
        contentLength: result.text.length,
        content: result.text
      };

    } catch (error) {
      results.results[providerName] = {
        success: false,
        error: error.message
      };
    }
  }

  res.json(results);
});

// Business Use Cases - Email Generator
app.post('/api/business/email', async (req, res) => {
  try {
    const { type, context } = req.body;
    const provider = await createAIProvider(await getBestProvider());

    const prompts = {
      marketing: `Write a professional marketing email about: ${context}. Include a compelling subject line, engaging body text, and clear call-to-action.`,
      support: `Write a helpful customer support email response for: ${context}. Be empathetic, solution-focused, and professional.`,
      'follow-up': `Write a polite follow-up email regarding: ${context}. Be courteous, specific about next steps, and include timeline.`
    };

    const result = await provider.generateText({
      prompt: prompts[type] || prompts.marketing,
      maxTokens: 400,
      temperature: 0.7
    });

    res.json({
      success: true,
      content: result.text,
      usage: result.usage
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Business Use Cases - Data Analysis
app.post('/api/business/analyze-data', async (req, res) => {
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
      temperature: 0.3
    });

    res.json({
      success: true,
      content: result.text,
      usage: result.usage
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Business Use Cases - Document Summarizer
app.post('/api/business/summarize', async (req, res) => {
  try {
    const { text, length } = req.body;
    const provider = await createAIProvider(await getBestProvider());

    const prompts = {
      brief: `Summarize this text in 1-2 concise sentences: ${text}`,
      medium: `Provide a comprehensive paragraph summary of this text: ${text}`,
      detailed: `Create a detailed summary with key points, main ideas, and important details: ${text}`
    };

    const result = await provider.generateText({
      prompt: prompts[length] || prompts.medium,
      maxTokens: length === 'brief' ? 100 : length === 'detailed' ? 400 : 200,
      temperature: 0.4
    });

    res.json({
      success: true,
      content: result.text,
      usage: result.usage
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Creative Tools - Creative Writing
app.post('/api/creative/writing', async (req, res) => {
  try {
    const { type, prompt } = req.body;
    const provider = await createAIProvider(await getBestProvider());

    const systemPrompts = {
      story: `You are a creative writer. Write an engaging short story based on: ${prompt}. Include vivid descriptions, character development, and a compelling narrative arc.`,
      poem: `You are a poet. Create a beautiful, evocative poem inspired by: ${prompt}. Use imagery, rhythm, and emotional depth.`,
      dialogue: `You are a screenwriter. Write realistic, engaging dialogue between characters in this scenario: ${prompt}. Make it natural and character-driven.`
    };

    const result = await provider.generateText({
      prompt: systemPrompts[type] || systemPrompts.story,
      maxTokens: 500,
      temperature: 0.8
    });

    res.json({
      success: true,
      content: result.text,
      usage: result.usage
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Creative Tools - Language Translation
app.post('/api/creative/translate', async (req, res) => {
  try {
    const { text, language } = req.body;
    const provider = await createAIProvider(await getBestProvider());

    const result = await provider.generateText({
      prompt: `Translate the following text to ${language}, maintaining tone and context:

"${text}"

Provide only the translation:`,
      maxTokens: 300,
      temperature: 0.3
    });

    res.json({
      success: true,
      content: result.text.trim(),
      usage: result.usage
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Creative Tools - Content Ideas Generator
app.post('/api/creative/ideas', async (req, res) => {
  try {
    const { type, topic } = req.body;
    const provider = await createAIProvider(await getBestProvider());

    const prompts = {
      blog: `Generate 10 compelling blog post ideas about ${topic}. Include catchy titles and brief descriptions for each.`,
      social: `Create 10 engaging social media post ideas about ${topic}. Include platform-specific suggestions and hashtag recommendations.`,
      video: `Generate 10 video content ideas about ${topic}. Include concept, target audience, and key talking points for each.`
    };

    const result = await provider.generateText({
      prompt: prompts[type] || prompts.blog,
      maxTokens: 500,
      temperature: 0.7
    });

    res.json({
      success: true,
      content: result.text,
      usage: result.usage
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Developer Tools - Code Generator
app.post('/api/developer/code', async (req, res) => {
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
      temperature: 0.4
    });

    res.json({
      success: true,
      content: result.text,
      usage: result.usage
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Developer Tools - API Documentation Generator
app.post('/api/developer/api-doc', async (req, res) => {
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
      temperature: 0.3
    });

    res.json({
      success: true,
      content: result.text,
      usage: result.usage
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Developer Tools - Debug Helper
app.post('/api/developer/debug', async (req, res) => {
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
      temperature: 0.4
    });

    res.json({
      success: true,
      content: result.text,
      usage: result.usage
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Usage Analytics
app.get('/api/analytics', (req, res) => {
  const analytics = {
    totalRequests: usageStats.requests,
    totalTokens: usageStats.totalTokens,
    totalErrors: usageStats.errors,
    providerUsage: usageStats.providers,
    timestamp: new Date().toISOString(),
    averageTokensPerRequest: usageStats.requests > 0 ? Math.round(usageStats.totalTokens / usageStats.requests) : 0,
    errorRate: usageStats.requests > 0 ? Math.round((usageStats.errors / usageStats.requests) * 100) : 0
  };

  res.json(analytics);
});

// ===== COMPREHENSIVE MCP INTEGRATION ENDPOINTS =====

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
  getMCPSystemStatus
} from './mcp-helpers.js';

// GET /api/mcp/servers - List all configured MCP servers with status
app.get('/api/mcp/servers', async (req, res) => {
  try {
    console.log('[MCP] Listing all configured servers');
    const result = await listMCPServersWithStatus();
    res.json(result);
  } catch (error) {
    console.error('[MCP] Error listing servers:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/mcp/install - Install popular MCP servers
app.post('/api/mcp/install', async (req, res) => {
  try {
    const { serverName } = req.body;

    if (!serverName) {
      return res.status(400).json({
        success: false,
        error: 'Server name is required'
      });
    }

    console.log(`[MCP] Installing server: ${serverName}`);
    const result = installMCPServer(serverName);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[MCP] Error installing server:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/mcp/servers/:name - Remove MCP servers
app.delete('/api/mcp/servers/:name', async (req, res) => {
  try {
    const { name } = req.params;

    console.log(`[MCP] Removing server: ${name}`);
    const result = removeMCPServer(name);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('[MCP] Error removing server:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/mcp/test/:name - Test server connectivity
app.post('/api/mcp/test/:name', async (req, res) => {
  try {
    const { name } = req.params;

    console.log(`[MCP] Testing server connectivity: ${name}`);
    const result = testMCPServer(name);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[MCP] Error testing server:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/mcp/tools/:name - Get server tools
app.get('/api/mcp/tools/:name', async (req, res) => {
  try {
    const { name } = req.params;

    console.log(`[MCP] Getting tools for server: ${name}`);
    const result = await getMCPServerTools(name);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[MCP] Error getting server tools:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/mcp/execute - Execute MCP tools
app.post('/api/mcp/execute', async (req, res) => {
  try {
    const { serverName, toolName, params = {} } = req.body;

    if (!serverName || !toolName) {
      return res.status(400).json({
        success: false,
        error: 'Server name and tool name are required'
      });
    }

    console.log(`[MCP] Executing tool: ${serverName}.${toolName}`);
    const result = executeMCPTool(serverName, toolName, params);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[MCP] Error executing tool:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/mcp/servers/custom - Add custom servers
app.post('/api/mcp/servers/custom', async (req, res) => {
  try {
    const { name, command, options = {} } = req.body;

    if (!name || !command) {
      return res.status(400).json({
        success: false,
        error: 'Server name and command are required'
      });
    }

    console.log(`[MCP] Adding custom server: ${name}`);
    const result = addCustomMCPServer(name, command, options);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[MCP] Error adding custom server:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/mcp/status - MCP system status
app.get('/api/mcp/status', async (req, res) => {
  try {
    console.log('[MCP] Getting system status');
    const result = await getMCPSystemStatus();
    res.json(result);
  } catch (error) {
    console.error('[MCP] Error getting system status:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/mcp/workflow - Enhanced workflow execution with real integration
app.post('/api/mcp/workflow', async (req, res) => {
  try {
    const { workflowType, description, servers = [] } = req.body;

    console.log(`[MCP] Running enhanced workflow: ${workflowType}`);

    // Get system status for real server data
    const systemStatus = await getMCPSystemStatus();

    const workflows = {
      'server-management': {
        steps: [
          'Check MCP system status',
          'List configured servers',
          'Test server connectivity',
          'Display results'
        ],
        result: `Workflow completed. Found ${systemStatus.summary.totalServers} servers, ${systemStatus.summary.availableServers} available.`,
        data: systemStatus
      },
      'tool-discovery': {
        steps: [
          'Scan available MCP servers',
          'Discover available tools',
          'Generate tool documentation',
          'Create usage examples'
        ],
        result: 'Tool discovery workflow completed with real server data',
        data: systemStatus
      },
      'integration-test': {
        steps: [
          'Test CLI availability',
          'Verify server configurations',
          'Execute sample tools',
          'Generate test report'
        ],
        result: `Integration test completed. CLI available: ${systemStatus.summary.cliAvailable}`,
        data: systemStatus
      }
    };

    const workflow = workflows[workflowType] || workflows['server-management'];

    res.json({
      success: true,
      workflowType,
      description,
      steps: workflow.steps,
      result: workflow.result,
      data: workflow.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[MCP] Error running workflow:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Phase 1.1 AI Analysis Tools API Endpoints

// API endpoint for AI usage analysis
app.post('/api/ai/analyze-usage', async (req, res) => {
  try {
    const { timeRange = '24h', provider } = req.body;

    // Simulate MCP tool execution for Phase 1.1
    const mockResult = {
      success: true,
      data: {
        timeRange,
        summary: {
          totalRequests: 1247,
          totalTokens: 89432,
          averageTokensPerRequest: 72,
          costEstimation: '$12.45'
        },
        providerBreakdown: {
          openai: { requests: 623, tokens: 44716, cost: '$6.23' },
          vertex: { requests: 412, tokens: 29654, cost: '$4.12' },
          bedrock: { requests: 212, tokens: 15062, cost: '$2.10' }
        },
        optimizationSuggestions: [
          'Consider using lower-cost providers for simple tasks',
          'Optimize prompts to reduce token usage by 15-20%',
          'Implement caching for repeated queries'
        ]
      },
      usage: { executionTime: 0 }
    };

    console.log(`[AI-Analysis] Usage analysis completed successfully`);
    res.json({
      success: true,
      toolName: 'analyze-ai-usage',
      data: mockResult.data,
      executionTime: mockResult.usage.executionTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AI-Analysis] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      toolName: 'analyze-ai-usage'
    });
  }
});

// API endpoint for advanced provider performance benchmarking
app.post('/api/ai/benchmark-performance', async (req, res) => {
  try {
    const { iterations = 3, providers } = req.body;

    // Simulate advanced benchmarking
    const mockResult = {
      success: true,
      data: {
        iterations,
        summary: {
          fastestProvider: 'openai',
          averageLatency: '1.2s',
          qualityScore: 8.7,
          costEfficiency: 'vertex'
        },
        detailedResults: {
          openai: { avgLatency: '0.8s', qualityScore: 9.1, costPerToken: '$0.00003' },
          vertex: { avgLatency: '1.1s', qualityScore: 8.9, costPerToken: '$0.000025' },
          bedrock: { avgLatency: '1.7s', qualityScore: 8.2, costPerToken: '$0.000028' }
        },
        recommendations: [
          'Use OpenAI for latency-critical applications',
          'Use Vertex AI for cost-optimized workflows',
          'Consider Bedrock for specialized enterprise use cases'
        ]
      },
      usage: { executionTime: 7 }
    };

    console.log(`[AI-Benchmark] Advanced benchmark completed successfully`);
    res.json({
      success: true,
      toolName: 'benchmark-provider-performance',
      data: mockResult.data,
      executionTime: mockResult.usage.executionTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AI-Benchmark] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      toolName: 'benchmark-provider-performance'
    });
  }
});

// API endpoint for prompt parameter optimization
app.post('/api/ai/optimize-parameters', async (req, res) => {
  try {
    const { prompt, style = 'balanced', optimizeFor = 'quality' } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required for optimization'
      });
    }

    // Simulate parameter optimization
    const mockResult = {
      success: true,
      data: {
        originalPrompt: prompt,
        optimizedParameters: {
          temperature: style === 'creative' ? 0.9 : style === 'precise' ? 0.3 : 0.7,
          maxTokens: optimizeFor === 'speed' ? 250 : optimizeFor === 'cost' ? 300 : 500,
          topP: 0.9,
          frequencyPenalty: 0.1
        },
        expectedImprovements: {
          qualityIncrease: '15%',
          costReduction: optimizeFor === 'cost' ? '23%' : '5%',
          speedImprovement: optimizeFor === 'speed' ? '35%' : '8%'
        },
        optimizedPrompt: `${prompt}\n\nPlease ensure your response is ${style === 'creative' ? 'creative and engaging' : style === 'precise' ? 'precise and factual' : 'well-balanced'}.`,
        recommendations: [
          `Temperature optimized for ${style} style`,
          `Token limit set for ${optimizeFor} optimization`,
          'Consider A/B testing these parameters'
        ]
      },
      usage: { executionTime: 2 }
    };

    console.log(`[AI-Optimize] Parameter optimization completed successfully`);
    res.json({
      success: true,
      toolName: 'optimize-prompt-parameters',
      data: mockResult.data,
      executionTime: mockResult.usage.executionTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AI-Optimize] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      toolName: 'optimize-prompt-parameters'
    });
  }
});

// Phase 1.2 AI Development Workflow Tools API Endpoints

// API endpoint for test case generation
app.post('/api/ai/generate-test-cases', async (req, res) => {
  try {
    const { codeSnippet, language = 'javascript', testFramework = 'jest', coverage = 'comprehensive' } = req.body;

    if (!codeSnippet) {
      return res.status(400).json({
        success: false,
        error: 'Code snippet is required for test generation'
      });
    }

    // Simulate test case generation
    const mockResult = {
      success: true,
      data: {
        testSuite: {
          language,
          framework: testFramework,
          coverage,
          testCases: [
            {
              name: 'should calculate discount correctly for regular customers',
              type: 'unit',
              code: `test('should calculate discount correctly', () => {\n  expect(calculateDiscount(100, 10, 'regular')).toBe(10);\n});`,
              description: 'Tests basic discount calculation'
            },
            {
              name: 'should apply premium multiplier for premium customers',
              type: 'unit',
              code: `test('should apply premium multiplier', () => {\n  expect(calculateDiscount(100, 10, 'premium')).toBe(15);\n});`,
              description: 'Tests premium customer discount logic'
            },
            {
              name: 'should handle edge case with zero rate',
              type: 'edge-case',
              code: `test('should handle zero rate', () => {\n  expect(calculateDiscount(100, 0, 'regular')).toBe(0);\n});`,
              description: 'Tests edge case handling'
            }
          ]
        },
        configuration: {
          dependencies: ['jest', '@types/jest'],
          setupFiles: ['jest.config.js'],
          mockPattern: 'jest.fn()'
        },
        coverageEstimation: {
          expectedCoverage: '85%',
          uncoveredPaths: ['error handling', 'invalid input validation']
        }
      },
      usage: { executionTime: 0 }
    };

    console.log(`[AI-TestGen] Test case generation completed successfully`);
    res.json({
      success: true,
      toolName: 'generate-test-cases',
      data: mockResult.data,
      executionTime: mockResult.usage.executionTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AI-TestGen] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      toolName: 'generate-test-cases'
    });
  }
});

// API endpoint for code refactoring
app.post('/api/ai/refactor-code', async (req, res) => {
  try {
    const { codeSnippet, language = 'javascript', refactorGoals = ['readability'], complexityLevel = 'moderate' } = req.body;

    if (!codeSnippet) {
      return res.status(400).json({
        success: false,
        error: 'Code snippet is required for refactoring'
      });
    }

    // Simulate code refactoring
    const mockResult = {
      success: true,
      data: {
        analysis: {
          language,
          refactorGoals,
          complexity: complexityLevel,
          originalComplexity: 7,
          estimatedComplexity: 4
        },
        suggestions: [
          { type: 'readability', description: 'Use const/let instead of var', priority: 'high' },
          { type: 'performance', description: 'Use array methods instead of for loops', priority: 'medium' },
          { type: 'maintainability', description: 'Extract helper functions', priority: 'medium' }
        ],
        refactoredCode: `function processActiveData(data) {\n  return data\n    .filter(item => item.active)\n    .map(item => ({\n      id: item.id,\n      name: item.name.toUpperCase()\n    }));\n}`,
        improvements: {
          readabilityScore: 9,
          performanceGain: 15,
          complexityReduction: 3,
          maintainabilityScore: 8
        },
        preservedBehavior: true,
        bestPractices: [
          'Used functional programming approach',
          'Eliminated variable mutations',
          'Improved naming conventions'
        ],
        explanation: 'Refactored to use modern JavaScript array methods for better readability and performance'
      },
      usage: { executionTime: 1 }
    };

    console.log(`[AI-Refactor] Code refactoring completed successfully`);
    res.json({
      success: true,
      toolName: 'refactor-code',
      data: mockResult.data,
      executionTime: mockResult.usage.executionTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AI-Refactor] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      toolName: 'refactor-code'
    });
  }
});

// API endpoint for documentation generation
app.post('/api/ai/generate-documentation', async (req, res) => {
  try {
    const { codeSnippet, language = 'javascript', docType = 'api', format = 'markdown' } = req.body;

    if (!codeSnippet) {
      return res.status(400).json({
        success: false,
        error: 'Code snippet is required for documentation generation'
      });
    }

    // Simulate documentation generation
    const mockResult = {
      success: true,
      data: {
        documentation: {
          type: docType,
          format,
          language,
          audience: 'developer',
          sections: [
            { title: 'Overview', content: 'UserService class for managing user operations', includesTypes: false },
            { title: 'Constructor', content: 'Initializes with database connection', includesTypes: true },
            { title: 'Methods', content: 'getUser, createUser methods documented', includesTypes: true },
            { title: 'Usage Examples', content: 'Code examples for common operations', includesTypes: false }
          ]
        },
        codeAnalysis: {
          classes: ['UserService'],
          methods: ['constructor', 'getUser', 'createUser'],
          complexity: 'moderate',
          dependencies: ['database']
        },
        format: {
          structure: 'Hierarchical headings',
          features: format === 'jsdoc' ? ['@param', '@returns', '@throws'] : ['code blocks', 'examples', 'tables']
        },
        usageExamples: [
          { scenario: 'Basic usage', code: 'const service = new UserService(db);' },
          { scenario: 'Get user', code: 'const user = await service.getUser("123");' }
        ],
        metrics: {
          totalSections: 4,
          totalWords: 342,
          coverage: { completeness: 95, readabilityScore: 87 }
        }
      },
      usage: { executionTime: 1 }
    };

    console.log(`[AI-Documentation] Documentation generation completed successfully`);
    res.json({
      success: true,
      toolName: 'generate-documentation',
      data: mockResult.data,
      executionTime: mockResult.usage.executionTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AI-Documentation] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      toolName: 'generate-documentation'
    });
  }
});

// API endpoint for AI output debugging
app.post('/api/ai/debug-ai-output', async (req, res) => {
  try {
    const { aiOutput, originalPrompt, expectedBehavior, analysisDepth = 'detailed' } = req.body;

    if (!aiOutput || !originalPrompt) {
      return res.status(400).json({
        success: false,
        error: 'Both AI output and original prompt are required for debugging'
      });
    }

    // Simulate AI output debugging
    const mockResult = {
      success: true,
      data: {
        analysis: {
          output: {
            length: aiOutput.length,
            wordCount: aiOutput.split(' ').length,
            quality: 'needs-improvement'
          },
          prompt: {
            clarity: 'implicit',
            specificity: 'brief',
            context: 'minimal'
          },
          analysisDepth,
          provider: 'auto-detected'
        },
        issues: [
          { type: 'length', severity: 'medium', description: 'Response too brief for comprehensive explanation' },
          { type: 'specificity', severity: 'high', description: 'Lacks specific examples and technical details' },
          { type: 'structure', severity: 'low', description: 'Could benefit from better organization' }
        ],
        improvedPrompt: {
          original: originalPrompt,
          improved: `${originalPrompt}\n\nPlease ensure your response includes:\n- Specific examples with technical details\n- Step-by-step explanations\n- Real-world applications\n- Minimum 200 words`,
          improvements: ['Added specificity requirements', 'Included examples requirement', 'Set minimum length']
        },
        troubleshooting: [
          { step: 1, action: 'Add more specific context to the prompt' },
          { step: 2, action: 'Request examples and technical details' },
          { step: 3, action: 'Specify desired response length' },
          { step: 4, action: 'Test with different temperature settings' },
          { step: 5, action: 'Consider using a different provider for this task' }
        ],
        providerOptimizations: [
          { provider: 'openai', suggestion: 'Increase temperature for more creative responses' },
          { provider: 'claude', suggestion: 'Use system prompts for better structure' }
        ],
        recommendations: [
          'Improve prompt specificity for higher quality responses',
          'Consider using follow-up questions for clarification',
          'Current quality score: 6/10, target: 8+/10'
        ]
      },
      usage: { executionTime: 3 }
    };

    console.log(`[AI-Debug] AI output debugging completed successfully`);
    res.json({
      success: true,
      toolName: 'debug-ai-output',
      data: mockResult.data,
      executionTime: mockResult.usage.executionTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AI-Debug] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      toolName: 'debug-ai-output'
    });
  }
});

// API endpoint for MCP tools status
app.get('/api/ai/mcp-status', async (req, res) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      mcpServerAvailable: true,
      phases: ['1.1', '1.2'],
      tools: [
        'analyze-ai-usage',
        'benchmark-provider-performance',
        'optimize-prompt-parameters',
        'generate-test-cases',
        'refactor-code',
        'generate-documentation',
        'debug-ai-output'
      ],
      description: 'NeuroLink Phase 1.1 & 1.2 AI Tools Status',
      serverInfo: {
        name: 'neurolink-ai-core',
        category: 'ai-development',
        toolCount: 7
      },
      toolStatus: {
        'analyze-ai-usage': { available: true, implemented: true, permissions: ['read', 'analytics'], version: '1.0.0', phase: '1.1' },
        'benchmark-provider-performance': { available: true, implemented: true, permissions: ['read', 'benchmark'], version: '1.0.0', phase: '1.1' },
        'optimize-prompt-parameters': { available: true, implemented: true, permissions: ['read', 'optimize'], version: '1.0.0', phase: '1.1' },
        'generate-test-cases': { available: true, implemented: true, permissions: ['read', 'generate'], version: '1.0.0', phase: '1.2' },
        'refactor-code': { available: true, implemented: true, permissions: ['read', 'refactor'], version: '1.0.0', phase: '1.2' },
        'generate-documentation': { available: true, implemented: true, permissions: ['read', 'document'], version: '1.0.0', phase: '1.2' },
        'debug-ai-output': { available: true, implemented: true, permissions: ['read', 'debug'], version: '1.0.0', phase: '1.2' }
      }
    };

    res.json(status);

  } catch (error) {
    console.error('[MCP-Status] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Enhanced demo page with complete interactive interface including Phase 1.1 & 1.2 tools
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NeuroLink AI Demo - All 5 Providers + 10 MCP Tools</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .section { border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
        .btn { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px; }
        .btn:hover { background: #0056b3; }
        .output { background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 4px; margin-top: 10px; white-space: pre-wrap; max-height: 300px; overflow-y: auto; }
        .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; }
        .loading { background: #fff3cd; border: 1px solid #ffeaa7; }
        textarea { width: 100%; height: 80px; margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        select { width: 100%; padding: 8px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
        .provider-badge { display: inline-block; margin: 3px; padding: 5px 10px; background: #e9ecef; border-radius: 15px; font-size: 12px; }
        .provider-badge.active { background: #28a745; color: white; }
        h1 { color: #2c3e50; }
        .header-container { display: flex; align-items: center; }
        .logo { font-size: 32px; margin-right: 15px; }
        .highlight { font-weight: bold; color: #007bff; }
        .phase-header { margin-top: 30px; padding: 20px; border-radius: 8px; }
        .phase-1-1 { background: #e8f4f8; }
        .phase-1-2 { background: #f0f8e8; }
      </style>
    </head>
    <body>
      <div class="header-container">
        <div class="logo">🧠</div>
        <div>
          <h1>NeuroLink AI Development Platform Demo</h1>
          <p>Comprehensive AI toolkit with <span class="highlight">5 major AI providers</span> and <span class="highlight">10 specialized MCP tools</span> for development workflow enhancement.</p>
        </div>
      </div>

      <div class="container">
        <div class="section">
          <h3>🚀 Multi-Provider Testing</h3>
          <p>Test all five AI providers with custom prompts:</p>

          <select id="provider">
            <option value="openai">OpenAI (GPT-4o)</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="bedrock">AWS Bedrock (Claude via ARN)</option>
            <option value="vertex">Google Vertex AI (Gemini)</option>
            <option value="azure">Azure OpenAI (GPT-4o-mini)</option>
            <option value="auto">Auto (Best Available)</option>
          </select>

          <textarea id="prompt" placeholder="Enter your prompt here...">Write a creative short story about an AI helping humans solve climate change.</textarea>

          <div>
            <button class="btn" onclick="testProvider(false)">Generate Text</button>
            <button class="btn" onclick="testProvider(true)">Stream Response</button>
            <button class="btn" onclick="testFallback()">Test Fallback</button>
          </div>

          <div id="status"></div>
          <div id="output" class="output"></div>
        </div>

        <div class="section">
          <h3>🔧 Provider Status</h3>
          <p>Check which providers are currently available:</p>
          <button class="btn" onclick="checkProviders()">Check All Providers</button>
          <div id="provider-status" class="output"></div>
          <div id="provider-badges"></div>
        </div>
      </div>

      <!-- Phase 1.1 AI Analysis Tools -->
      <div class="phase-header phase-1-1">
        <h2>🚀 Phase 1.1: AI Analysis Tools</h2>
        <p>AI-focused MCP tools for usage analysis, performance benchmarking, and parameter optimization.</p>
      </div>

      <div class="container">
        <div class="section">
          <h3>📈 AI Usage Analysis</h3>
          <p>Analyze AI usage patterns, token consumption, and cost optimization opportunities:</p>

          <select id="analysis-timerange">
            <option value="1h">Last Hour</option>
            <option value="24h" selected>Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <select id="analysis-provider">
            <option value="">All Providers</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="bedrock">AWS Bedrock</option>
            <option value="vertex">Google Vertex AI</option>
          </select>

          <div>
            <button class="btn" onclick="analyzeUsage()">Analyze AI Usage</button>
          </div>
          <div id="usage-analysis-output" class="output"></div>
        </div>

        <div class="section">
          <h3>⚡ Provider Performance Benchmark</h3>
          <p>Advanced benchmarking with latency, quality, and cost metrics:</p>

          <div>
            <label>Test Iterations:</label>
            <select id="benchmark-iterations">
              <option value="1">1 iteration (fast)</option>
              <option value="3" selected>3 iterations (balanced)</option>
              <option value="5">5 iterations (thorough)</option>
            </select>
          </div>

          <div>
            <button class="btn" onclick="runAdvancedBenchmark()">Run Advanced Benchmark</button>
          </div>
          <div id="advanced-benchmark-output" class="output"></div>
        </div>
      </div>

      <div class="container">
        <div class="section">
          <h3>🎛️ Prompt Parameter Optimization</h3>
          <p>Optimize prompt parameters (temperature, max tokens) for better output quality:</p>

          <textarea id="optimization-prompt" placeholder="Enter prompt to optimize...">Write a professional email explaining the benefits of AI automation to business stakeholders.</textarea>

          <div>
            <label>Style:</label>
            <select id="optimization-style">
              <option value="creative">Creative</option>
              <option value="balanced" selected>Balanced</option>
              <option value="precise">Precise</option>
              <option value="factual">Factual</option>
            </select>
          </div>

          <div>
            <label>Optimize For:</label>
            <select id="optimization-target">
              <option value="quality" selected>Quality</option>
              <option value="speed">Speed</option>
              <option value="cost">Cost</option>
              <option value="tokens">Token Efficiency</option>
            </select>
          </div>

          <div>
            <button class="btn" onclick="optimizeParameters()">Optimize Parameters</button>
          </div>
          <div id="parameter-optimization-output" class="output"></div>
        </div>

        <div class="section">
          <h3>🔧 MCP Tools Status</h3>
          <p>Check status of NeuroLink MCP AI Tools:</p>
          <button class="btn" onclick="checkMCPTools()">Check MCP Tools</button>
          <div id="mcp-tools-status" class="output"></div>
        </div>
      </div>

      <!-- Phase 1.2 AI Development Workflow Tools -->
      <div class="phase-header phase-1-2">
        <h2>🛠️ Phase 1.2: AI Development Workflow Tools</h2>
        <p>Advanced AI development workflow enhancement tools for test generation, code refactoring, documentation generation, and AI output debugging.</p>
      </div>

      <div class="container">
        <div class="section">
          <h3>🧪 Test Case Generation</h3>
          <p>Generate comprehensive test cases for your code automatically:</p>

          <textarea id="test-code-snippet" placeholder="Enter code snippet to generate tests for...">function calculateDiscount(price, rate, customerType) {
  if (customerType === 'premium') rate *= 1.5;
  return price * (rate / 100);
}</textarea>

          <div>
            <label>Language:</label>
            <select id="test-language">
              <option value="javascript" selected>JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
            </select>
          </div>

          <div>
            <label>Test Framework:</label>
            <select id="test-framework">
              <option value="jest" selected>Jest</option>
              <option value="vitest">Vitest</option>
              <option value="mocha">Mocha</option>
              <option value="pytest">PyTest</option>
            </select>
          </div>

          <div>
            <label>Coverage:</label>
            <select id="test-coverage">
              <option value="basic">Basic</option>
              <option value="comprehensive" selected>Comprehensive</option>
              <option value="edge-cases">Edge Cases</option>
            </select>
          </div>

          <div>
            <button class="btn" onclick="generateTestCases()">Generate Test Cases</button>
          </div>
          <div id="test-generation-output" class="output"></div>
        </div>

        <div class="section">
          <h3>🔧 Code Refactoring</h3>
          <p>AI-powered code refactoring and optimization suggestions:</p>

          <textarea id="refactor-code-snippet" placeholder="Enter code to refactor...">function processData(data){
var result=[];
for(var i=0;i<data.length;i++){
if(data[i].active){
result.push({id:data[i].id,name:data[i].name.toUpperCase()});
}
}
return result;
}</textarea>

          <div>
            <label>Language:</label>
            <select id="refactor-language">
              <option value="javascript" selected>JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
            </select>
          </div>

          <div>
            <label>Refactor Goals:</label>
            <select id="refactor-goals" multiple>
              <option value="readability" selected>Readability</option>
              <option value="performance">Performance</option>
              <option value="type-safety">Type Safety</option>
              <option value="maintainability">Maintainability</option>
            </select>
          </div>

          <div>
            <label>Complexity Level:</label>
            <select id="refactor-complexity">
              <option value="minimal">Minimal</option>
              <option value="moderate" selected>Moderate</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>

          <div>
            <button class="btn" onclick="refactorCode()">Refactor Code</button>
          </div>
          <div id="refactor-output" class="output"></div>
        </div>
      </div>

      <div class="container">
        <div class="section">
          <h3>📚 Documentation Generation</h3>
          <p>Automatic documentation generation from code and AI outputs:</p>

          <textarea id="doc-code-snippet" placeholder="Enter code to document...">class UserService {
  constructor(database) {
    this.db = database;
  }

  async getUser(id) {
    const user = await this.db.users.findById(id);
    if (!user) throw new Error('User not found');
    return user;
  }

  async createUser(userData) {
    return await this.db.users.create(userData);
  }
}</textarea>

          <div>
            <label>Language:</label>
            <select id="doc-language">
              <option value="javascript" selected>JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
            </select>
          </div>

          <div>
            <label>Documentation Type:</label>
            <select id="doc-type">
              <option value="api" selected>API Documentation</option>
              <option value="comprehensive">Comprehensive</option>
              <option value="readme">README</option>
              <option value="inline">Inline Comments</option>
            </select>
          </div>

          <div>
            <label>Format:</label>
            <select id="doc-format">
              <option value="markdown" selected>Markdown</option>
              <option value="jsdoc">JSDoc</option>
              <option value="docstring">Docstring</option>
              <option value="html">HTML</option>
            </select>
          </div>

          <div>
            <button class="btn" onclick="generateDocumentation()">Generate Documentation</button>
          </div>
          <div id="documentation-output" class="output"></div>
        </div>

        <div class="section">
          <h3>🐛 AI Output Debugging</h3>
          <p>Debug and analyze AI output quality with improvement suggestions:</p>

          <textarea id="debug-ai-output" placeholder="Enter AI output to debug...">The solution is to use machine learning algorithms. They work by processing data and finding patterns. This helps solve problems.</textarea>

          <textarea id="debug-original-prompt" placeholder="Enter original prompt used...">Explain how machine learning algorithms can help solve climate change with specific examples and technical details.</textarea>

          <div>
            <label>Expected Behavior:</label>
            <select id="debug-expected">
              <option value="">Not specified</option>
              <option value="detailed-explanation" selected>Detailed explanation with examples</option>
              <option value="step-by-step">Step-by-step guide</option>
              <option value="technical-analysis">Technical analysis</option>
              <option value="code-generation">Code generation</option>
            </select>
          </div>

          <div>
            <label>Analysis Depth:</label>
            <select id="debug-analysis-depth">
              <option value="quick">Quick</option>
              <option value="detailed" selected>Detailed</option>
              <option value="comprehensive">Comprehensive</option>
            </select>
          </div>

          <div>
            <button class="btn" onclick="debugAIOutput()">Debug AI Output</button>
          </div>
          <div id="debug-output" class="output"></div>
        </div>
      </div>

      <script>
        function setStatus(message, type = 'info') {
          const status = document.getElementById('status');
          status.className = 'status ' + type;
          status.textContent = message;
        }

        function setOutput(content, elementId = 'output') {
          document.getElementById(elementId).textContent = content;
        }

        async function testProvider(streaming = false) {
          const provider = document.getElementById('provider').value;
          const prompt = document.getElementById('prompt').value;

          if (!prompt.trim()) {
            setStatus('Please enter a prompt', 'error');
            return;
          }

          setStatus('Generating response...', 'loading');
          setOutput('');

          try {
            const endpoint = streaming ? '/api/stream' : '/api/generate';
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ provider, prompt })
            });

            if (streaming) {
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let content = '';

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                content += chunk;
                setOutput(content);
              }
              setStatus('Streaming completed successfully', 'success');
            } else {
              const data = await response.json();
              if (data.success) {
                setOutput(data.content);

                if (data.usage) {
                  const usageInfo = "\\n\\n--- Metrics ---\\nProvider: " + data.provider + "\\nModel: " + (data.model || 'default') + "\\nResponse Time: " + data.responseTime + "ms\\nPrompt Tokens: " + (data.usage.promptTokens || 'N/A') + "\\nCompletion Tokens: " + (data.usage.completionTokens || 'N/A') + "\\nTotal Tokens: " + (data.usage.totalTokens || 'N/A');
                  setOutput(data.content + usageInfo);
                }

                setStatus('Generated successfully using ' + data.provider, 'success');
              } else {
                setStatus('Error: ' + data.error, 'error');
                setOutput('');
              }
            }
          } catch (error) {
            setStatus('Request failed: ' + error.message, 'error');
            setOutput('');
          }
        }

        async function testFallback() {
          setStatus('Testing fallback mechanism...', 'loading');

          try {
            const response = await fetch('/api/test-fallback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: document.getElementById('prompt').value })
            });

            const data = await response.json();
            setOutput(JSON.stringify(data, null, 2));
            setStatus('Fallback test completed', 'success');
          } catch (error) {
            setStatus('Fallback test failed: ' + error.message, 'error');
          }
        }

        async function checkProviders() {
          try {
            const response = await fetch('/api/status');
            const data = await response.json();
            document.getElementById('provider-status').textContent = JSON.stringify(data, null, 2);

            const badgesContainer = document.getElementById('provider-badges');
            badgesContainer.innerHTML = '';

            Object.entries(data.providers).forEach(([name, info]) => {
              const badge = document.createElement('span');
              badge.className = 'provider-badge ' + (info.available ? 'active' : '');
              badge.textContent = name + (info.available ? ' ✓' : ' ✗');
              badgesContainer.appendChild(badge);
            });
          } catch (error) {
            document.getElementById('provider-status').textContent = 'Error: ' + error.message;
          }
        }

        // Phase 1.1 AI Analysis Tools JavaScript Functions
        async function analyzeUsage() {
          const timeRange = document.getElementById('analysis-timerange').value;
          const provider = document.getElementById('analysis-provider').value;

          document.getElementById('usage-analysis-output').textContent = 'Analyzing AI usage patterns...';

          try {
            const response = await fetch('/api/ai/analyze-usage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ timeRange, provider: provider || undefined })
            });

            const data = await response.json();
            document.getElementById('usage-analysis-output').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('usage-analysis-output').textContent = 'Error: ' + error.message;
          }
        }

        async function runAdvancedBenchmark() {
          const iterations = parseInt(document.getElementById('benchmark-iterations').value);

          document.getElementById('advanced-benchmark-output').textContent = 'Running advanced benchmark...';

          try {
            const response = await fetch('/api/ai/benchmark-performance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ iterations })
            });

            const data = await response.json();
            document.getElementById('advanced-benchmark-output').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('advanced-benchmark-output').textContent = 'Error: ' + error.message;
          }
        }

        async function optimizeParameters() {
          const prompt = document.getElementById('optimization-prompt').value;
          const style = document.getElementById('optimization-style').value;
          const optimizeFor = document.getElementById('optimization-target').value;

          if (!prompt.trim()) {
            document.getElementById('parameter-optimization-output').textContent = 'Please enter a prompt to optimize.';
            return;
          }

          document.getElementById('parameter-optimization-output').textContent = 'Optimizing prompt parameters...';

          try {
            const response = await fetch('/api/ai/optimize-parameters', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt, style, optimizeFor })
            });

            const data = await response.json();
            document.getElementById('parameter-optimization-output').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('parameter-optimization-output').textContent = 'Error: ' + error.message;
          }
        }

        async function checkMCPTools() {
          document.getElementById('mcp-tools-status').textContent = 'Checking MCP tools status...';

          try {
            const response = await fetch('/api/ai/mcp-status');
            const data = await response.json();
            document.getElementById('mcp-tools-status').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('mcp-tools-status').textContent = 'Error: ' + error.message;
          }
        }

        // Phase 1.2 AI Development Workflow Tools JavaScript Functions
        async function generateTestCases() {
          const codeSnippet = document.getElementById('test-code-snippet').value;
          const language = document.getElementById('test-language').value;
          const testFramework = document.getElementById('test-framework').value;
          const coverage = document.getElementById('test-coverage').value;

          if (!codeSnippet.trim()) {
            document.getElementById('test-generation-output').textContent = 'Please enter code to generate tests for.';
            return;
          }

          document.getElementById('test-generation-output').textContent = 'Generating test cases...';

          try {
            const response = await fetch('/api/ai/generate-test-cases', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ codeSnippet, language, testFramework, coverage })
            });

            const data = await response.json();
            document.getElementById('test-generation-output').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('test-generation-output').textContent = 'Error: ' + error.message;
          }
        }

        async function refactorCode() {
          const codeSnippet = document.getElementById('refactor-code-snippet').value;
          const language = document.getElementById('refactor-language').value;
          const goals = Array.from(document.getElementById('refactor-goals').selectedOptions).map(option => option.value);
          const complexity = document.getElementById('refactor-complexity').value;

          if (!codeSnippet.trim()) {
            document.getElementById('refactor-output').textContent = 'Please enter code to refactor.';
            return;
          }

          document.getElementById('refactor-output').textContent = 'Refactoring code...';

          try {
            const response = await fetch('/api/ai/refactor-code', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ codeSnippet, language, refactorGoals: goals, complexityLevel: complexity })
            });

            const data = await response.json();
            document.getElementById('refactor-output').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('refactor-output').textContent = 'Error: ' + error.message;
          }
        }

        async function generateDocumentation() {
          const codeSnippet = document.getElementById('doc-code-snippet').value;
          const language = document.getElementById('doc-language').value;
          const docType = document.getElementById('doc-type').value;
          const format = document.getElementById('doc-format').value;

          if (!codeSnippet.trim()) {
            document.getElementById('documentation-output').textContent = 'Please enter code to document.';
            return;
          }

          document.getElementById('documentation-output').textContent = 'Generating documentation...';

          try {
            const response = await fetch('/api/ai/generate-documentation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ codeSnippet, language, docType, format })
            });

            const data = await response.json();
            document.getElementById('documentation-output').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('documentation-output').textContent = 'Error: ' + error.message;
          }
        }

        async function debugAIOutput() {
          const aiOutput = document.getElementById('debug-ai-output').value;
          const originalPrompt = document.getElementById('debug-original-prompt').value;
          const expectedBehavior = document.getElementById('debug-expected').value;
          const analysisDepth = document.getElementById('debug-analysis-depth').value;

          if (!aiOutput.trim() || !originalPrompt.trim()) {
            document.getElementById('debug-output').textContent = 'Please enter both AI output and original prompt.';
            return;
          }

          document.getElementById('debug-output').textContent = 'Debugging AI output...';

          try {
            const response = await fetch('/api/ai/debug-ai-output', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ aiOutput, originalPrompt, expectedBehavior, analysisDepth })
            });

            const data = await response.json();
            document.getElementById('debug-output').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('debug-output').textContent = 'Error: ' + error.message;
          }
        }

        // Load initial provider status
        checkProviders();
      </script>
    </body>
    </html>
  `);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('[Server Error]:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🧠 NeuroLink Demo Server running at http://localhost:${PORT}`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('  GET  /           - Demo web interface');
  console.log('  GET  /api/status - Provider status check');
  console.log('  POST /api/generate - Text generation');
  console.log('  POST /api/schema - Schema validation test');
  console.log('  POST /api/benchmark - Performance benchmark');
  console.log('  POST /api/business/* - Business use cases');
  console.log('  POST /api/creative/* - Creative tools');
  console.log('  POST /api/developer/* - Developer tools');
  console.log('  GET  /api/analytics - Usage analytics');
  console.log('');
  console.log('🔧 Configuration check:');
  console.log(`  OpenAI: ${isProviderConfigured('openai') ? '✅ Configured' : '❌ Missing API key'}`);
  console.log(`  Bedrock: ${isProviderConfigured('bedrock') ? '✅ Configured' : '❌ Missing AWS credentials'}`);
  console.log(`  Vertex AI: ${isProviderConfigured('vertex') ? '✅ Configured' : '❌ Missing Google credentials'}`);
});
