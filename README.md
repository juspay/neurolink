# 🧠 NeuroLink

[![npm version](https://badge.fury.io/js/%40juspay%2Fneurolink.svg)](https://badge.fury.io/js/%40juspay%2Fneurolink)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Production-ready AI toolkit with multi-provider support, automatic fallback, and full TypeScript integration. **Now with a professional CLI!**

**NeuroLink** provides a unified interface for AI providers (OpenAI, Amazon Bedrock, Google Vertex AI) with intelligent fallback, streaming support, and type-safe APIs. Available as both a **programmatic SDK** and a **professional CLI tool**. Extracted from production use at Juspay.

## 🚀 Quick Start

### 📦 Installation

```bash
# Install globally for CLI usage
npm install -g @juspay/neurolink

# Or use directly with npx (no installation required)
npx @juspay/neurolink generate-text "Hello, AI!"
npx @juspay/neurolink status

# Global CLI Installation
npm install -g @juspay/neurolink
neurolink generate-text "Write a haiku about programming"

# SDK Installation
npm install @juspay/neurolink ai @ai-sdk/amazon-bedrock @ai-sdk/openai @ai-sdk/google-vertex zod
```

### Programmatic Usage
```typescript
import { createBestAIProvider } from '@juspay/neurolink';

// Auto-selects best available provider
const provider = createBestAIProvider();
const result = await provider.generateText({
  prompt: "Hello, AI!"
});

console.log(result.text);
console.log(`Used: ${result.provider}`);
```

### Environment Setup
```bash
# Create .env file (automatically loaded by CLI) ✨ NEW!
# OpenAI
echo 'OPENAI_API_KEY="sk-your-openai-key"' > .env
echo 'OPENAI_MODEL="gpt-4o"' >> .env

# Amazon Bedrock
echo 'AWS_ACCESS_KEY_ID="your-aws-access-key"' >> .env
echo 'AWS_SECRET_ACCESS_KEY="your-aws-secret-key"' >> .env
echo 'AWS_REGION="us-east-1"' >> .env
echo 'BEDROCK_MODEL="arn:aws:bedrock:region:account:inference-profile/model"' >> .env

# Google Vertex AI
echo 'GOOGLE_VERTEX_PROJECT="your-project-id"' >> .env
echo 'GOOGLE_VERTEX_LOCATION="us-central1"' >> .env
echo 'GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"' >> .env

# Anthropic
echo 'ANTHROPIC_API_KEY="sk-ant-api03-your-key"' >> .env

# Azure OpenAI
echo 'AZURE_OPENAI_API_KEY="your-azure-key"' >> .env
echo 'AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"' >> .env
echo 'AZURE_OPENAI_DEPLOYMENT_ID="your-deployment-name"' >> .env

# Test configuration (automatically loads .env)
npx @juspay/neurolink status
```

**📖 [Complete Environment Variables Guide](./docs/ENVIRONMENT-VARIABLES.md)** - Detailed setup instructions for all providers

## 🎬 Complete Visual Documentation

**No installation required!** Experience NeuroLink's capabilities through our comprehensive visual ecosystem:

### 🌐 Web Demo Screenshots & Videos

#### **📸 Interactive Web Interface Screenshots**
| Feature | Screenshot | Description |
|---------|------------|-------------|
| **Main Interface** | ![Main Interface](./neurolink-demo/screenshots/01-overview/01-main-interface-overview-2025-06-04T13-56-43-628Z.png) | Complete web interface showing all features |
| **AI Generation Results** | ![AI Generation](./neurolink-demo/screenshots/02-basic-examples/02-ai-generation-results-2025-06-04T13-57-13-156Z.png) | Real AI content generation in action |
| **Business Use Cases** | ![Business Cases](./neurolink-demo/screenshots/03-business-use-cases/03-business-use-cases-2025-06-04T13-59-07-846Z.png) | Professional business applications |
| **Creative Tools** | ![Creative Tools](./neurolink-demo/screenshots/04-creative-tools/04-creative-tools-2025-06-04T13-59-24-346Z.png) | Creative content generation |
| **Developer Tools** | ![Developer Tools](./neurolink-demo/screenshots/05-developer-tools/05-developer-tools-2025-06-04T13-59-43-322Z.png) | Code generation and API docs |
| **Analytics & Monitoring** | ![Monitoring](./neurolink-demo/screenshots/06-monitoring/06-monitoring-analytics-2025-06-04T14-00-08-919Z.png) | Real-time provider analytics |

#### **🎥 Complete Demo Videos** *(Real AI generation showing SDK use cases)*
- **[Basic Examples](./neurolink-demo/videos/basic-examples.webm)** - Core SDK functionality: text generation, streaming, provider selection, status checks
- **[Business Use Cases](./neurolink-demo/videos/business-use-cases.webm)** - Professional applications: marketing emails, quarterly data analysis, executive summaries
- **[Creative Tools](./neurolink-demo/videos/creative-tools.webm)** - Content creation: storytelling, translation, blog post ideas
- **[Developer Tools](./neurolink-demo/videos/developer-tools.webm)** - Technical applications: React components, API documentation, error debugging
- **[Monitoring & Analytics](./neurolink-demo/videos/monitoring-analytics.webm)** - SDK features: performance benchmarks, provider fallback, structured data generation

**Available formats:**
- **WebM** (web-optimized): All videos available as `.webm` for web embedding
- **MP4** (universal): All videos available as `.mp4` for desktop and mobile compatibility

### 🖥️ CLI Tool Screenshots & Videos

#### **📸 Professional CLI Screenshots**
| Command | Screenshot | Description |
|---------|------------|-------------|
| **CLI Help Overview** | ![CLI Help](./docs/visual-content/screenshots/cli-screenshots/01-cli-help-2025-06-04T19-38-12.png) | Complete command reference |
| **Provider Status Check** | ![Provider Status](./docs/visual-content/screenshots/cli-screenshots/02-provider-status-2025-06-04T19-38-25.png) | All provider connectivity verified |
| **Text Generation** | ![Text Generation](./docs/visual-content/screenshots/cli-screenshots/03-text-generation-2025-06-04T19-38-30.png) | Real AI haiku generation with JSON |
| **Auto Provider Selection** | ![Best Provider](./docs/visual-content/screenshots/cli-screenshots/04-best-provider-2025-06-04T19-38-33.png) | Automatic provider selection working |
| **Batch Processing** | ![Batch Results](./docs/visual-content/screenshots/cli-screenshots/05-batch-results-2025-06-04T19-38-37.png) | Multi-prompt processing with results |

#### **🎥 CLI Demonstration Videos** *(Real command execution)*
- **[CLI Overview](./docs/visual-content/videos/cli-videos/cli-overview/)** - Help, status, provider selection commands
- **[Basic Generation](./docs/visual-content/videos/cli-videos/cli-basic-generation/)** - Text generation with different providers
- **[Batch Processing](./docs/visual-content/videos/cli-videos/cli-batch-processing/)** - File-based multi-prompt processing
- **[Real-time Streaming](./docs/visual-content/videos/cli-videos/cli-streaming/)** - Live AI content streaming
- **[Advanced Features](./docs/visual-content/videos/cli-videos/cli-advanced-features/)** - Verbose diagnostics and provider options

### 💻 Live Interactive Demo
- **Working Express.js server** with real API integration
- **All 3 providers functional** (OpenAI, Bedrock, Vertex AI)
- **15+ use cases** demonstrated across business, creative, and developer tools
- **Real-time provider analytics** with performance metrics

**Access**: `cd neurolink-demo && npm start` - [📁 View complete visual documentation](./neurolink-demo/)

## 📚 Documentation

### Quick Reference
- **[🖥️ CLI Guide](./docs/CLI-GUIDE.md)** - Complete CLI commands, options, and examples
- **[🏗️ Framework Integration](./docs/FRAMEWORK-INTEGRATION.md)** - SvelteKit, Next.js, Express.js, React hooks
- **[🔧 Environment Variables](./docs/ENVIRONMENT-VARIABLES.md)** - Complete setup guide for all AI providers
- **[⚙️ Provider Configuration](./docs/PROVIDER-CONFIGURATION.md)** - OpenAI, Bedrock, Vertex AI setup guides
- **[📚 API Reference](./docs/API-REFERENCE.md)** - Complete TypeScript API documentation
- **[🎬 Visual Demos](./docs/VISUAL-DEMOS.md)** - Screenshots, videos, and interactive examples

### Key Features

🔄 **Multi-Provider Support** - OpenAI, Amazon Bedrock, Google Vertex AI
⚡ **Automatic Fallback** - Seamless provider switching on failures
📡 **Streaming & Non-Streaming** - Real-time responses and standard generation
🎯 **TypeScript First** - Full type safety and IntelliSense support
🛡️ **Production Ready** - Extracted from proven production systems
🔧 **Zero Config** - Works out of the box with environment variables

## 🖥️ CLI Tool

### Core Commands

```bash
# Text Generation
npx @juspay/neurolink generate-text "Explain quantum computing"
npx @juspay/neurolink generate-text "Write a story" --provider openai --temperature 0.9

# Real-time Streaming
npx @juspay/neurolink stream "Tell me a story about robots"

# Batch Processing
echo -e "Write a haiku\nExplain gravity" > prompts.txt
npx @juspay/neurolink batch prompts.txt --output results.json

# Provider Diagnostics
npx @juspay/neurolink status --verbose
npx @juspay/neurolink get-best-provider
```

### CLI Features

✨ **Professional UX** - Animated spinners, colorized output, progress tracking
🛠️ **Developer-Friendly** - Multiple output formats, provider selection, status monitoring
🔧 **Automation Ready** - JSON output, exit codes, scriptable for CI/CD pipelines

**[📖 View complete CLI documentation](./docs/CLI-GUIDE.md)**

## 🏗️ Framework Integration

### SvelteKit
```typescript
import { createBestAIProvider } from '@juspay/neurolink';

export const POST: RequestHandler = async ({ request }) => {
  const { message } = await request.json();
  const provider = createBestAIProvider();
  const result = await provider.streamText({ prompt: message });
  return new Response(result.toReadableStream());
};
```

### Next.js
```typescript
import { createBestAIProvider } from '@juspay/neurolink';

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();
  const provider = createBestAIProvider();
  const result = await provider.generateText({ prompt });
  return NextResponse.json({ text: result.text });
}
```

### React Hook
```typescript
import { useState } from 'react';

export function useAI() {
  const [loading, setLoading] = useState(false);

  const generate = async (prompt: string) => {
    setLoading(true);
    const response = await fetch('/api/ai', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });
    const data = await response.json();
    setLoading(false);
    return data.text;
  };

  return { generate, loading };
}
```

**[📖 View complete framework integration guide](./docs/FRAMEWORK-INTEGRATION.md)**

## ⚙️ Provider Configuration

### OpenAI
```bash
export OPENAI_API_KEY="sk-your-openai-key"
```

### Amazon Bedrock (⚠️ Requires Inference Profile ARN)
```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export BEDROCK_MODEL="arn:aws:bedrock:us-east-2:<account_id>:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0"
```

### Google Vertex AI (Multiple Auth Methods)
```bash
# Method 1: Service Account File
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
export GOOGLE_VERTEX_PROJECT="your-project-id"

# Method 2: JSON String
export GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
export GOOGLE_VERTEX_PROJECT="your-project-id"

# Method 3: Individual Variables
export GOOGLE_AUTH_CLIENT_EMAIL="service-account@project.iam.gserviceaccount.com"
export GOOGLE_AUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
export GOOGLE_VERTEX_PROJECT="your-project-id"
```

**[📖 View complete provider configuration guide](./docs/PROVIDER-CONFIGURATION.md)**

## 📚 API Reference

### Core Functions
```typescript
// Auto-select best provider
const provider = createBestAIProvider();

// Specific provider
const openai = AIProviderFactory.createProvider('openai', 'gpt-4o');

// With fallback
const { primary, fallback } = createAIProviderWithFallback('bedrock', 'openai');
```

### Provider Interface
```typescript
interface AIProvider {
  generateText(options: GenerateTextOptions): Promise<GenerateTextResult>;
  streamText(options: StreamTextOptions): Promise<StreamTextResult>;
}

interface GenerateTextOptions {
  prompt: string;
  temperature?: number;    // 0.0 to 1.0, default: 0.7
  maxTokens?: number;      // Default: 500
  systemPrompt?: string;
}
```

### Supported Models
- **OpenAI**: `gpt-4o` (default), `gpt-4o-mini`, `gpt-4-turbo`
- **Bedrock**: `claude-3-7-sonnet` (default), `claude-3-5-sonnet`, `claude-3-haiku`
- **Vertex AI**: `gemini-2.5-flash` (default), `claude-sonnet-4@20250514`

**[📖 View complete API reference](./docs/API-REFERENCE.md)**

## 🎯 Visual Content Benefits

- ✅ **No Installation Required** - See everything in action before installing
- ✅ **Real AI Content** - All screenshots and videos show actual AI generation
- ✅ **Professional Quality** - 1920x1080 resolution suitable for documentation
- ✅ **Complete Coverage** - Every major feature visually documented
- ✅ **Production Validation** - Demonstrates real-world usage patterns

**[📖 View complete visual demonstrations](./docs/VISUAL-DEMOS.md)**

## 🚀 Getting Started

1. **Try CLI immediately**: `npx @juspay/neurolink status`
2. **View live demo**: `cd neurolink-demo && npm start`
3. **Set up providers**: See [Provider Configuration Guide](./docs/PROVIDER-CONFIGURATION.md)
4. **Integrate with your framework**: See [Framework Integration Guide](./docs/FRAMEWORK-INTEGRATION.md)
5. **Build with the SDK**: See [API Reference](./docs/API-REFERENCE.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/juspay/neurolink
cd neurolink
pnpm install
pnpm test
pnpm build
```

## 📄 License

MIT © [Juspay Technologies](https://juspay.in)

## 🔗 Related Projects

- [Vercel AI SDK](https://github.com/vercel/ai) - Underlying provider implementations
- [SvelteKit](https://kit.svelte.dev) - Web framework used in this project
- [Lighthouse](https://github.com/juspay/lighthouse) - Original source project

---

<p align="center">
  <strong>Built with ❤️ by <a href="https://juspay.in">Juspay Technologies</a></strong>
</p>
