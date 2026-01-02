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

**Version**: v7.47.0
**Last Updated**: September 26, 2025

> Looking for the full configuration story? Start with [`docs/CONFIGURATION.md`](../CONFIGURATION.md) for detailed environment variable explanations, evaluation toggles, and regional routing notes. This reference focuses on quick lookup tables.

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
```

```typescript
// SDK
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "openai",
});
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
npm run start:model-server

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
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Use aliases for easy access
const result = await neurolink.generate({
  input: { text: "Write code" },
  provider: "anthropic",
  model: "claude-latest", // Auto-resolves to latest Claude
});

// Capability-based selection with vision model
const visionResult = await neurolink.generate({
  input: { text: "Describe this image" },
  provider: "openai",
  model: "gpt-4o", // Vision-capable model
});

// Use cost-effective models
const efficientResult = await neurolink.generate({
  input: { text: "Quick task" },
  provider: "anthropic",
  model: "claude-3-haiku", // Cost-effective option
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

#### **HTTP Transport Configuration**

For remote MCP servers, use HTTP transport with authentication, retry, and rate limiting:

```json
{
  "mcpServers": {
    "remote-api": {
      "transport": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN",
        "X-API-Key": "your-api-key"
      },
      "httpOptions": {
        "connectionTimeout": 30000,
        "requestTimeout": 60000,
        "idleTimeout": 120000,
        "keepAliveTimeout": 30000
      },
      "retryConfig": {
        "maxAttempts": 3,
        "initialDelay": 1000,
        "maxDelay": 30000,
        "backoffMultiplier": 2
      },
      "rateLimiting": {
        "requestsPerMinute": 60,
        "maxBurst": 10,
        "useTokenBucket": true
      }
    }
  }
}
```

**HTTP Transport Options:**

| Option         | Type     | Description                             |
| -------------- | -------- | --------------------------------------- |
| `transport`    | `"http"` | Transport type for remote servers       |
| `url`          | `string` | URL of the remote MCP endpoint          |
| `headers`      | `object` | HTTP headers for authentication         |
| `httpOptions`  | `object` | Connection and timeout settings         |
| `retryConfig`  | `object` | Retry behavior with exponential backoff |
| `rateLimiting` | `object` | Rate limiting configuration             |

See [MCP HTTP Transport Guide](../MCP-HTTP-TRANSPORT.md) for complete documentation.

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
npm install @juspay/neurolink

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
import { NeuroLink } from "@juspay/neurolink";

// Create NeuroLink instance with custom settings
const neurolink = new NeuroLink({
  timeout: 30000,
});

// Generate with specific provider
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "openai",
  model: "gpt-4o",
});
```

### **Tool Configuration**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Enable/disable tools via generate options
const result = await neurolink.generate({
  input: { text: "What time is it?" },
  provider: "openai",
  maxToolRoundtrips: 5, // Control tool call iterations
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
