# 🧠 Zephyr-Mind AI Toolkit

A powerful, production-ready AI toolkit extracted from the lighthouse project, providing unified multi-provider AI integration with automatic fallback, streaming support, and extensible tool system.

## 🎯 What is Zephyr-Mind?

Zephyr-Mind is a standalone SvelteKit library that packages the proven AI functionality from lighthouse into a reusable toolkit. It provides a clean, unified interface for working with multiple AI providers while handling complexities like automatic fallback, streaming responses, and provider-specific configurations.

### **Core Philosophy**
- **Provider Agnostic**: Works with Bedrock, OpenAI, Google Vertex AI
- **Fault Tolerant**: Automatic fallback when providers fail
- **Production Ready**: Extracted from working production code
- **Developer Friendly**: Clean APIs with full TypeScript support

## 🚀 Key Features

### **🔄 Multi-Provider Support**
- **Amazon Bedrock**: Claude 3.5 Sonnet, Claude 3.7 Sonnet
- **OpenAI**: GPT-4o, GPT-4o Mini
- **Google Vertex AI**: Claude 4.0 Sonnet, Gemini 2.5 Flash
- **Automatic Fallback**: If one provider fails, automatically try the next

### **📡 Streaming & Non-Streaming**
- **Real-time Streaming**: Server-Sent Events for live responses
- **Standard Generation**: Traditional request-response for simple use cases
- **Unified API**: Same interface for both modes

### **🛠️ Tool Integration**
- **Extensible Registry**: Register custom tools and functions
- **Type-Safe**: Full TypeScript support for tool definitions
- **Simple Integration**: Easy to add new capabilities

### **⚡ Developer Experience**
- **SvelteKit Library**: Modern build tooling with Vite
- **TypeScript First**: Complete type safety and IntelliSense
- **Environment Ready**: Pre-configured for common deployment scenarios
- **Test Endpoint**: Built-in API route for testing functionality

## 🎮 Use Cases

### **1. Chat Applications**
```typescript
import { generateStreamingResponse } from 'zephyr-mind';

const response = await generateStreamingResponse("Hello, how are you?");
// Handle streaming response for real-time chat
```

### **2. Content Generation**
```typescript
import { generateTextResponse } from 'zephyr-mind';

const result = await generateTextResponse("Write a product description for a coffee mug");
console.log(result.text); // Generated content
```

### **3. Multi-Project Integration**
```typescript
// Same AI functionality across different projects
import { generateStreamingResponse, AIProviderName } from 'zephyr-mind';

// Use in web app
const webResponse = await generateStreamingResponse(prompt);

// Use in API service
const apiResponse = await generateStreamingResponse(prompt, {
  providers: [{ provider: AIProviderName.BEDROCK, models: ['claude-3-7-sonnet'] }]
});
```

### **4. Fallback-Critical Applications**
```typescript
// Automatic provider fallback for high-availability systems
const response = await generateStreamingResponse("Critical business query", {
  providers: [
    { provider: 'bedrock', models: ['claude-3-7-sonnet'] },    // Primary
    { provider: 'openai', models: ['gpt-4o'] },                // Fallback 1
    { provider: 'vertex', models: ['gemini-2.5-flash'] }       // Fallback 2
  ]
});
```

## 📦 Installation

```bash
# Using npm
npm install zephyr-mind

# Using pnpm (recommended)
pnpm add zephyr-mind

# Using yarn
yarn add zephyr-mind
```

### **Peer Dependencies**
Zephyr-Mind requires these peer dependencies:

```bash
pnpm add ai @ai-sdk/amazon-bedrock @ai-sdk/openai @ai-sdk/google-vertex zod
```

## ⚙️ Configuration

### **1. Environment Setup**
Copy the environment template and configure your API keys:

```bash
cp node_modules/zephyr-mind/.env.example .env
```

### **2. Required Environment Variables**

```bash
# Provider Selection
AI_DEFAULT_PROVIDER="bedrock"
AI_FALLBACK_PROVIDER="vertex"

# OpenAI Configuration
OPENAI_API_KEY="your_openai_api_key"

# Google Vertex AI
GOOGLE_VERTEX_PROJECT="your-gcp-project"
GOOGLE_VERTEX_LOCATION="us-east5"

# Amazon Bedrock
AWS_ACCESS_KEY_ID="your_aws_key"
AWS_SECRET_ACCESS_KEY="your_aws_secret"
AWS_REGION="us-east-2"
```

### **3. Provider Authentication**

#### **Bedrock Setup**
```bash
# AWS credentials via environment
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"
export AWS_REGION="us-east-2"
```

#### **OpenAI Setup**
```bash
# OpenAI API key
export OPENAI_API_KEY="sk-your_key_here"
```

#### **Vertex AI Setup**
```bash
# Google Cloud credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
export GOOGLE_VERTEX_PROJECT="your-project-id"
```

## 📖 API Reference

### **generateStreamingResponse(prompt, options)**
Generates a streaming AI response with automatic provider fallback.

```typescript
import { generateStreamingResponse } from 'zephyr-mind';

const response = await generateStreamingResponse(
  "Explain quantum computing",
  {
    providers: [
      { provider: 'bedrock', models: ['claude-3-7-sonnet'] },
      { provider: 'openai', models: ['gpt-4o'] }
    ],
    temperature: 0.7,
    maxTokens: 2048
  }
);

// Handle streaming response
const reader = response.body?.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = new TextDecoder().decode(value);
  console.log(chunk); // Stream chunks
}
```

### **generateTextResponse(prompt, options)**
Generates a standard (non-streaming) AI response.

```typescript
import { generateTextResponse } from 'zephyr-mind';

const result = await generateTextResponse(
  "Summarize this article: ...",
  {
    providers: [{ provider: 'vertex', models: ['claude-4.0-sonnet'] }],
    temperature: 0.3
  }
);

if (result.success) {
  console.log(result.text);
  console.log(`Used: ${result.provider}:${result.model}`);
} else {
  console.error(result.error);
}
```

### **AIProviderFactory**
Advanced provider management for custom configurations.

```typescript
import { AIProviderFactory, AIProviderName } from 'zephyr-mind';

const provider = AIProviderFactory.createProviderWithModel(
  AIProviderName.BEDROCK,
  'claude-3-7-sonnet'
);

const result = await provider.streamText("Custom provider usage");
```

### **Tool Registration**
Extend functionality with custom tools.

```typescript
import { initializeTools } from 'zephyr-mind';

const customTools = [
  {
    name: 'weather',
    description: 'Get weather information',
    handler: async (location: string) => {
      // Custom tool implementation
      return `Weather in ${location}: Sunny, 72°F`;
    }
  }
];

initializeTools(customTools);
```

## 🧪 Testing Your Setup

### **1. Using the Built-in Test Endpoint**
If using as a SvelteKit library in your project:

```bash
# Start development server
pnpm dev

# Test the API endpoint
curl -X POST http://localhost:5173/api/test \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, Zephyr-Mind!"}'
```

### **2. Programmatic Testing**

```typescript
import { generateTextResponse } from 'zephyr-mind';

async function testZephyrMind() {
  try {
    const result = await generateTextResponse("Test prompt");
    console.log("✅ Zephyr-Mind is working:", result.text);
  } catch (error) {
    console.error("❌ Setup issue:", error);
  }
}

testZephyrMind();
```

## 🏗️ Integration Examples

### **SvelteKit Integration**
```typescript
// src/routes/api/chat/+server.ts
import { generateStreamingResponse } from 'zephyr-mind';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const { message } = await request.json();
  return await generateStreamingResponse(message);
};
```

### **Express.js Integration**
```typescript
import express from 'express';
import { generateTextResponse } from 'zephyr-mind';

const app = express();

app.post('/ai/generate', async (req, res) => {
  const { prompt } = req.body;
  const result = await generateTextResponse(prompt);
  res.json(result);
});
```

### **Next.js API Route**
```typescript
// pages/api/ai.ts
import { generateStreamingResponse } from 'zephyr-mind';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { prompt } = req.body;
    const response = await generateStreamingResponse(prompt);
    return response;
  }
}
```

## 🔧 Advanced Configuration

### **Custom Provider Configurations**
```typescript
import { generateStreamingResponse, AIProviderName } from 'zephyr-mind';

const customConfig = {
  providers: [
    {
      provider: AIProviderName.BEDROCK,
      models: ['claude-3-7-sonnet', 'claude-3-5-sonnet']
    },
    {
      provider: AIProviderName.OPENAI,
      models: ['gpt-4o']
    }
  ],
  temperature: 0.8,
  maxTokens: 4096,
  systemPrompt: "You are a helpful AI assistant."
};

const response = await generateStreamingResponse("Your prompt", customConfig);
```

### **Environment-Based Provider Selection**
```typescript
// Automatically choose providers based on environment
const isDevelopment = process.env.NODE_ENV === 'development';

const providers = isDevelopment
  ? [{ provider: 'openai', models: ['gpt-4o-mini'] }]  // Cheaper for dev
  : [{ provider: 'bedrock', models: ['claude-3-7-sonnet'] }]; // Production

const response = await generateStreamingResponse(prompt, { providers });
```

## 🚨 Troubleshooting

### **Common Issues**

#### **"Provider authentication failed"**
- Verify API keys are set correctly
- Check AWS credentials for Bedrock
- Ensure Google Cloud authentication for Vertex

#### **"No providers available"**
- At least one provider must be configured
- Check environment variables
- Verify API keys have proper permissions

#### **"Streaming response failed"**
- Ensure proper CORS headers if using from browser
- Check network connectivity
- Verify model names are correct

### **Debug Mode**
Enable verbose logging:

```typescript
// Set environment variable
process.env.ZEPHYR_MIND_DEBUG = 'true';

// Or in code
import { generateStreamingResponse } from 'zephyr-mind';

const response = await generateStreamingResponse(prompt, {
  debug: true  // Enables detailed logging
});
```

## 📊 Performance & Limits

### **Provider Limits**
- **Bedrock**: Varies by model and region
- **OpenAI**: Rate limits based on tier
- **Vertex AI**: Quota-based limits

### **Optimization Tips**
1. **Use appropriate models**: Claude 3.5 Sonnet for quality, GPT-4o Mini for speed
2. **Configure fallbacks**: Always have backup providers
3. **Set reasonable maxTokens**: Avoid unnecessary costs
4. **Cache responses**: For repeated queries

## 🤝 Contributing

This package extracts functionality from lighthouse. To contribute:

1. **Test thoroughly**: Ensure compatibility with lighthouse
2. **Maintain API consistency**: Don't break existing interfaces
3. **Document changes**: Update README and tracker
4. **Follow conventions**: Match existing code style

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Related Projects

- **Lighthouse**: Original source of AI functionality
- **Vercel AI SDK**: Underlying provider implementations
- **SvelteKit**: Framework and build tooling

---

**Built with ❤️ by Juspay Technologies**
