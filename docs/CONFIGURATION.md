# ⚙️ NeuroLink Configuration Guide

## ✅ IMPLEMENTATION STATUS: COMPLETE (2025-01-07)

**Generate Function Migration completed - Configuration examples updated**

- ✅ All code examples now show `generate()` as primary method
- ✅ Legacy `generate()` examples preserved for reference
- ✅ Factory pattern configuration benefits documented
- ✅ Zero configuration changes required for migration

> **Migration Note**: Configuration remains identical for both `generate()` and `generate()`.
> All existing configurations continue working unchanged.

---

**Version**: v7.14.3
**Last Updated**: August 18, 2025

---

## 📖 **Overview**

This guide covers all configuration options for NeuroLink, including AI provider setup, dynamic model configuration, MCP integration, and environment configuration.

### **Basic Usage Examples**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// NEW: Primary method (recommended)
const result = await neurolink.generate({
  input: { text: "Configure AI providers" },
  provider: "google-ai",
  temperature: 0.7,
});

// LEGACY: Still fully supported
const legacyResult = await neurolink.generate({
  prompt: "Configure AI providers",
  provider: "google-ai",
  temperature: 0.7,
});
```

---

## 🤖 **AI Provider Configuration**

### **Environment Variables**

NeuroLink supports multiple AI providers. Set up one or more API keys:

```bash
# Google AI Studio (Recommended - Free tier available)
export GOOGLE_AI_API_KEY="AIza-your-google-ai-api-key"

# OpenAI
export OPENAI_API_KEY="sk-your-openai-api-key"

# Anthropic
export ANTHROPIC_API_KEY="sk-ant-your-anthropic-api-key"

# Azure OpenAI
export AZURE_OPENAI_API_KEY="your-azure-key"
export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"

# AWS Bedrock
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"

# Hugging Face
export HUGGING_FACE_API_KEY="hf_your-hugging-face-token"

# Mistral AI
export MISTRAL_API_KEY="your-mistral-api-key"
```

### **.env File Configuration**

Create a `.env` file in your project root:

```env
# .env file - automatically loaded by NeuroLink
GOOGLE_AI_API_KEY=AIza-your-google-ai-api-key
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key

# Optional: Provider preferences
NEUROLINK_PREFERRED_PROVIDER=google-ai
NEUROLINK_DEBUG=false
```

### **Provider Selection Priority**

NeuroLink automatically selects the best available provider:

1. **Google AI Studio** (if `GOOGLE_AI_API_KEY` is set)
2. **OpenAI** (if `OPENAI_API_KEY` is set)
3. **Anthropic** (if `ANTHROPIC_API_KEY` is set)
4. **Other providers** in order of availability

**Force specific provider**:

```bash
# CLI
npx neurolink generate "Hello" --provider openai

# SDK
const provider = createAIProvider('openai');
```

### **Ollama Configuration (Local AI)**

Run local models with Ollama for complete privacy and offline access.

```bash
# Ollama requires a running local service
# Download from https://ollama.ai

# No API key needed. NeuroLink auto-detects at http://localhost:11434.
# Use a specific model:
export OLLAMA_MODEL="llama3.2:latest"
```

### **LiteLLM Configuration (100+ Models)**

Access over 100 models from various providers through a single, unified interface.

```bash
# Start the LiteLLM proxy server first
pip install litellm && litellm --port 4000

# Configure environment variables
export LITELLM_BASE_URL="http://localhost:4000"
export LITELLM_API_KEY="sk-anything" # Can be any string for local proxy
```

### **Amazon SageMaker Configuration (Custom Models)**

Deploy and use your own custom-trained models on AWS.

```bash
# AWS Credentials
export AWS_ACCESS_KEY_ID="your-aws-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
export AWS_REGION="us-east-1" # Or your preferred region

# SageMaker Endpoint
export SAGEMAKER_DEFAULT_ENDPOINT="your-sagemaker-endpoint-name"
```

### **OpenAI Compatible Configuration**

Connect to any API endpoint that follows the OpenAI specification (e.g., OpenRouter, vLLM).

```bash
# Point to your compatible endpoint
export OPENAI_COMPATIBLE_BASE_URL="https://api.openrouter.ai/api/v1"
export OPENAI_COMPATIBLE_API_KEY="sk-or-v1-your-api-key"

# Optional: specify a model, otherwise it will be auto-discovered
export OPENAI_COMPATIBLE_MODEL="openai/gpt-4o-mini"
```

---

## 🎯 **Dynamic Model Configuration (v1.8.0+)**

### **Overview**

The dynamic model system enables intelligent model selection, cost optimization, and runtime model configuration without code changes.

### **Environment Variables**

```bash
# Dynamic Model System Configuration
export MODEL_SERVER_URL="http://localhost:3001"           # Model config server URL
export MODEL_CONFIG_PATH="./config/models.json"           # Model configuration file
export ENABLE_DYNAMIC_MODELS="true"                       # Enable dynamic models
export DEFAULT_MODEL_PREFERENCE="quality"                 # 'cost', 'speed', or 'quality'
export FALLBACK_MODEL="gpt-4o-mini"                      # Fallback when preferred unavailable
```

### **Model Configuration Server**

Start the model configuration server to enable dynamic model features:

```bash
# Start the model server (provides REST API for model configs)
pnpm run modelServer

# Server provides endpoints at http://localhost:3001:
# GET /models                     - List all models
# GET /models/search?capability=vision - Search by capability
# GET /models/provider/anthropic  - Get provider models
# GET /models/resolve/claude-latest - Resolve aliases
```

### **Model Configuration File**

Create or modify `config/models.json` to define available models:

```json
{
  "models": [
    {
      "id": "claude-3-5-sonnet",
      "name": "Claude 3.5 Sonnet",
      "provider": "anthropic",
      "pricing": { "input": 0.003, "output": 0.015 },
      "capabilities": ["functionCalling", "vision", "code"],
      "contextWindow": 200000,
      "deprecated": false,
      "aliases": ["claude-latest", "best-coding"]
    }
  ],
  "aliases": {
    "claude-latest": "claude-3-5-sonnet",
    "fastest": "gpt-4o-mini",
    "cheapest": "claude-3-haiku"
  }
}
```

### **Dynamic Model Usage**

#### **CLI Usage**

```bash
# Use model aliases for convenience
npx neurolink generate "Write code" --model best-coding

# Capability-based selection
npx neurolink generate "Describe image" --capability vision --optimize-cost

# Search and discover models
npx neurolink models search --capability functionCalling --max-price 0.001
npx neurolink models list
npx neurolink models best --use-case coding
```

#### **SDK Usage**

```typescript
import { AIProviderFactory, DynamicModelRegistry } from "@juspay/neurolink";

const factory = new AIProviderFactory();
const registry = new DynamicModelRegistry();

// Use aliases for easy access
const provider = await factory.createProvider({
  provider: "anthropic",
  model: "claude-latest", // Auto-resolves to latest Claude
});

// Capability-based selection
const visionProvider = await factory.createProvider({
  provider: "auto",
  capability: "vision", // Automatically selects best vision model
  optimizeFor: "cost", // Prefer cost-effective options
});

// Find optimal model for specific needs
const bestModel = await registry.findBestModel({
  capability: "code",
  maxPrice: 0.005, // Max $0.005 per 1K tokens
  provider: "anthropic", // Prefer Anthropic models
});
```

### **Benefits**

- ✅ **Runtime Updates**: Add new models without code deployment
- ✅ **Smart Selection**: Automatic model selection based on capabilities
- ✅ **Cost Optimization**: Choose models based on price constraints
- ✅ **Easy Aliases**: Use friendly names like "claude-latest", "fastest"
- ✅ **Provider Agnostic**: Unified interface across all AI providers

---

## 🛠️ **MCP Configuration (v1.7.1)**

### **Built-in Tools Configuration**

Built-in tools are automatically available in v1.7.1:

```json
{
  "builtInTools": {
    "enabled": true,
    "tools": ["time", "utilities", "registry", "configuration", "validation"]
  }
}
```

**Test built-in tools**:

```bash
# Built-in tools work immediately
npx neurolink generate "What time is it?" --debug
```

### **External MCP Server Configuration**

External servers are auto-discovered from all major AI tools:

#### **Auto-Discovery Locations**

**macOS**:

```bash
~/Library/Application Support/Claude/
~/Library/Application Support/Code/User/
~/.cursor/
~/.codeium/windsurf/
```

**Linux**:

```bash
~/.config/Code/User/
~/.continue/
~/.aider/
```

**Windows**:

```bash
%APPDATA%/Code/User/
```

#### **Manual MCP Configuration**

Create `.mcp-config.json` in your project root:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/"],
      "transport": "stdio"
    }
  }
}
```

### **MCP Discovery Commands**

```bash
# Discover all external servers
npx neurolink mcp discover --format table

# Export discovery results
npx neurolink mcp discover --format json > discovered-servers.json

# Test discovery
npx neurolink mcp discover --format yaml
```

---

## 🖥️ **CLI Configuration**

### **Global CLI Options**

```bash
# Debug mode
export NEUROLINK_DEBUG=true

# Preferred provider
export NEUROLINK_PREFERRED_PROVIDER=google-ai

# Custom timeout
export NEUROLINK_TIMEOUT=30000
```

### **Command-line Options**

```bash
# Provider selection
npx neurolink generate "Hello" --provider openai

# Debug output
npx neurolink generate "Hello" --debug

# Temperature control
npx neurolink generate "Hello" --temperature 0.7

# Token limits
npx neurolink generate "Hello" --max-tokens 1000

# Disable tools
npx neurolink generate "Hello" --disable-tools
```

---

## 📊 **Development Configuration**

### **TypeScript Configuration**

For TypeScript projects, add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true
  },
  "include": ["src/**/*", "node_modules/@juspay/neurolink/dist/**/*"]
}
```

### **Package.json Scripts**

Add useful scripts to your `package.json`:

```json
{
  "scripts": {
    "neurolink:status": "npx neurolink status --verbose",
    "neurolink:test": "npx neurolink generate 'Test message'",
    "neurolink:mcp-discover": "npx neurolink mcp discover --format table",
    "neurolink:mcp-test": "npx neurolink generate 'What time is it?' --debug"
  }
}
```

### **Environment Setup Script**

Create `setup-neurolink.sh`:

```bash
#!/bin/bash

echo "🧠 NeuroLink Environment Setup"

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js v18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js v18+ required. Current version: $(node -v)"
    exit 1
fi

# Install NeuroLink
echo "📦 Installing NeuroLink..."
pnpm install @juspay/neurolink

# Create .env template
if [ ! -f .env ]; then
    echo "📝 Creating .env template..."
    cat > .env << EOF
# NeuroLink Configuration
# Set at least one API key:

# Google AI Studio (Free tier available)
GOOGLE_AI_API_KEY=AIza-your-google-ai-api-key

# OpenAI (Paid service)
# OPENAI_API_KEY=sk-your-openai-api-key

# Optional settings
NEUROLINK_DEBUG=false
NEUROLINK_PREFERRED_PROVIDER=google-ai
EOF
    echo "✅ Created .env template. Please add your API keys."
else
    echo "ℹ️  .env file already exists"
fi

# Test installation
echo "🧪 Testing installation..."
if npx neurolink status > /dev/null 2>&1; then
    echo "✅ NeuroLink installed successfully"

    # Test MCP discovery
    echo "🔍 Testing MCP discovery..."
    SERVERS=$(npx neurolink mcp discover --format json 2>/dev/null | jq '.servers | length' 2>/dev/null || echo "0")
    echo "✅ Discovered $SERVERS external MCP servers"

    echo ""
    echo "🎉 Setup complete! Next steps:"
    echo "1. Add your API key to .env file"
    echo "2. Test: npx neurolink generate 'Hello'"
    echo "3. Test MCP tools: npx neurolink generate 'What time is it?' --debug"
else
    echo "❌ Installation test failed"
    exit 1
fi
```

---

## 🔧 **Advanced Configuration**

### **Custom Provider Configuration**

```typescript
import { createAIProvider } from "@juspay/neurolink";

// Custom provider settings
const provider = createAIProvider("openai", {
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.openai.com/v1",
  timeout: 30000,
  retries: 3,
});
```

### **Tool Configuration**

```typescript
// Enable/disable tools
const result = await provider.generate({
  prompt: "Hello",
  tools: {
    enabled: true,
    allowedTools: ["time", "utilities"],
    maxToolCalls: 5,
  },
});
```

### **Logging Configuration**

```bash
# Enable detailed logging
export NEUROLINK_DEBUG=true
export NEUROLINK_LOG_LEVEL=verbose

# Custom log format
export NEUROLINK_LOG_FORMAT=json
```

---

## 🛡️ **Security Configuration**

### **API Key Security**

```bash
# Use environment variables (not hardcoded)
export GOOGLE_AI_API_KEY="$(cat ~/.secrets/google-ai-key)"

# Use .env files (add to .gitignore)
echo ".env" >> .gitignore
```

### **Tool Security**

```json
{
  "toolSecurity": {
    "allowedDomains": ["api.example.com"],
    "blockedTools": ["dangerous-tool"],
    "requireConfirmation": true
  }
}
```

---

## 🧪 **Testing Configuration**

### **Test Environment Setup**

```bash
# Test environment
export NEUROLINK_ENV=test
export NEUROLINK_DEBUG=true

# Mock providers for testing
export NEUROLINK_MOCK_PROVIDERS=true
```

### **Validation Commands**

```bash
# Validate configuration
npx neurolink status --verbose

# Test built-in tools (v1.7.1)
npx neurolink generate "What time is it?" --debug

# Test external discovery
npx neurolink mcp discover --format table

# Full system test
npm run build && npm run test:run -- test/mcp-comprehensive.test.ts
```

---

## 📚 **Configuration Examples**

### **Minimal Setup (Google AI)**

```bash
export GOOGLE_AI_API_KEY="AIza-your-key"
npx neurolink generate "Hello"
```

### **Multi-Provider Setup**

```env
GOOGLE_AI_API_KEY=AIza-your-google-key
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
NEUROLINK_PREFERRED_PROVIDER=google-ai
```

### **Development Setup**

```env
NEUROLINK_DEBUG=true
NEUROLINK_LOG_LEVEL=verbose
NEUROLINK_TIMEOUT=60000
NEUROLINK_MOCK_PROVIDERS=false
```

---

**💡 For most users, setting `GOOGLE_AI_API_KEY` is sufficient to get started with NeuroLink and test all MCP functionality!**
