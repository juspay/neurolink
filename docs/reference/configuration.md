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

> Looking for the full configuration story? Start with [`docs/configuration.md`](../configuration.md) for detailed environment variable explanations, evaluation toggles, and regional routing notes. This reference focuses on quick lookup tables.

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

See [MCP HTTP Transport Guide](../mcp-http-transport.md) for complete documentation.

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

## Context Compaction Configuration

### Overview

Context compaction automatically manages conversation history to keep it within a model's context window. When the estimated input tokens exceed a configurable threshold (default: 80% of available input space), a multi-stage reduction pipeline runs before the next LLM call. The four stages, in order, are:

1. **Tool Output Pruning** -- Replace old, large tool results with compact placeholders (no LLM call)
2. **File Read Deduplication** -- Keep only the latest read of each file path (no LLM call)
3. **LLM Summarization** -- Produce a structured summary of older messages (requires LLM call)
4. **Sliding Window Truncation** -- Tag the oldest messages as truncated (no LLM call)

Each stage only runs if the previous stage did not bring token usage below the target. The pipeline exits early once the context fits.

### SDK Configuration

Configure context compaction through the `contextCompaction` field inside `conversationMemory`:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    enableSummarization: true,

    contextCompaction: {
      // Enable auto-compaction (default: true when summarization enabled)
      enabled: true,

      // Compaction trigger threshold as fraction of available input tokens.
      // When usage ratio >= this value, compaction runs automatically.
      // Range: 0.0 - 1.0. Default: 0.80
      threshold: 0.8,

      // Enable Stage 1: tool output pruning (default: true)
      enablePruning: true,

      // Enable Stage 2: file read deduplication (default: true)
      enableDeduplication: true,

      // Enable Stage 4: sliding window truncation fallback (default: true)
      enableSlidingWindow: true,

      // Maximum tool output size in bytes before truncation.
      // Default: 51200 (50 KB)
      maxToolOutputBytes: 51200,

      // Maximum tool output lines before truncation.
      // Default: 2000
      maxToolOutputLines: 2000,

      // Fraction of remaining context budget allocated to file reads.
      // Range: 0.0 - 1.0. Default: 0.60
      fileReadBudgetPercent: 0.6,
    },

    // Provider and model used for Stage 3 (LLM summarization).
    // These are top-level conversationMemory fields, not inside contextCompaction.
    summarizationProvider: "vertex",
    summarizationModel: "gemini-2.5-flash",
  },
});
```

**Field Reference:**

| Field                   | Type      | Default                             | Description                                     |
| ----------------------- | --------- | ----------------------------------- | ----------------------------------------------- |
| `enabled`               | `boolean` | `true` (when summarization enabled) | Master switch for auto-compaction               |
| `threshold`             | `number`  | `0.80`                              | Usage ratio that triggers compaction (0.0--1.0) |
| `enablePruning`         | `boolean` | `true`                              | Enable Stage 1: tool output pruning             |
| `enableDeduplication`   | `boolean` | `true`                              | Enable Stage 2: file read deduplication         |
| `enableSlidingWindow`   | `boolean` | `true`                              | Enable Stage 4: sliding window truncation       |
| `maxToolOutputBytes`    | `number`  | `51200`                             | Tool output byte limit (50 KB)                  |
| `maxToolOutputLines`    | `number`  | `2000`                              | Tool output line limit                          |
| `fileReadBudgetPercent` | `number`  | `0.60`                              | Fraction of remaining context for file reads    |

Summarization provider/model are configured at the `conversationMemory` level:

| Field                   | Type     | Default              | Description                            |
| ----------------------- | -------- | -------------------- | -------------------------------------- |
| `summarizationProvider` | `string` | `"vertex"`           | Provider for Stage 3 LLM summarization |
| `summarizationModel`    | `string` | `"gemini-2.5-flash"` | Model for Stage 3 LLM summarization    |

### CLI Flags

The `loop` command accepts two context compaction flags:

```bash
# Set compaction threshold (0.0-1.0, default: 0.8)
npx neurolink loop --compact-threshold 0.70

# Disable automatic compaction entirely
npx neurolink loop --disable-compaction
```

| Flag                   | Type      | Default | Description                                     |
| ---------------------- | --------- | ------- | ----------------------------------------------- |
| `--compact-threshold`  | `number`  | `0.8`   | Context compaction trigger threshold (0.0--1.0) |
| `--disable-compaction` | `boolean` | `false` | Disable automatic context compaction            |

These flags map to `contextCompaction.threshold` and `contextCompaction.enabled` respectively.

### Per-Provider Context Windows

The budget checker uses per-provider, per-model context window sizes to calculate available input tokens. The available input space is:

```
availableInput = contextWindow - outputReserve
```

Where `outputReserve` defaults to 35% of the context window (capped at 64,000 tokens), or the explicit `maxTokens` value if provided.

| Provider         | Model                                                                             | Input Token Limit |
| ---------------- | --------------------------------------------------------------------------------- | ----------------- |
| **Anthropic**    | claude-opus-4, claude-sonnet-4, claude-3.5-sonnet, claude-3-opus (all variants)   | 200,000           |
| **OpenAI**       | gpt-4o, gpt-4o-mini, gpt-4-turbo, o1-mini                                         | 128,000           |
| **OpenAI**       | o1, o1-pro, o3, o3-mini, o4-mini                                                  | 200,000           |
| **OpenAI**       | gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, gpt-5                                        | 1,047,576         |
| **OpenAI**       | gpt-4                                                                             | 8,192             |
| **OpenAI**       | gpt-3.5-turbo                                                                     | 16,385            |
| **Google AI**    | gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash, gemini-3-\* | 1,048,576         |
| **Google AI**    | gemini-1.5-pro                                                                    | 2,097,152         |
| **Vertex**       | gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash              | 1,048,576         |
| **Vertex**       | gemini-1.5-pro                                                                    | 2,097,152         |
| **Bedrock**      | anthropic.claude-3-\* (all variants)                                              | 200,000           |
| **Bedrock**      | amazon.nova-pro-v1:0, amazon.nova-lite-v1:0                                       | 300,000           |
| **Azure**        | gpt-4o, gpt-4o-mini, gpt-4-turbo                                                  | 128,000           |
| **Azure**        | gpt-4                                                                             | 8,192             |
| **Mistral**      | mistral-large-latest, mistral-small-latest                                        | 128,000           |
| **Mistral**      | codestral-latest                                                                  | 256,000           |
| **Mistral**      | mistral-medium-latest                                                             | 32,000            |
| **Ollama**       | (default)                                                                         | 128,000           |
| **LiteLLM**      | (default)                                                                         | 128,000           |
| **Hugging Face** | (default)                                                                         | 32,000            |
| **SageMaker**    | (default)                                                                         | 128,000           |

Unknown providers or models fall back to a global default of 128,000 tokens.

### Advanced Configuration

#### Manual Compaction with `compactSession()`

You can trigger compaction manually on any session using the `CompactionConfig` interface, which provides per-stage control beyond what the SDK-level `contextCompaction` field exposes:

```typescript
import { NeuroLink } from "@juspay/neurolink";
import type { CompactionConfig, CompactionResult } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: { enabled: true },
});

const result: CompactionResult | null = await neurolink.compactSession(
  "session-abc-123",
  {
    // Per-stage toggles
    enablePrune: true,
    enableDeduplicate: true,
    enableSummarize: true,
    enableTruncate: true,

    // Stage 1 (prune) options
    pruneProtectTokens: 40_000, // Protect recent N tokens from pruning
    pruneMinimumSavings: 20_000, // Only prune if savings exceed this
    pruneProtectedTools: ["skill"], // Tool names to never prune

    // Stage 3 (summarize) options
    summarizationProvider: "vertex",
    summarizationModel: "gemini-2.5-flash",
    keepRecentRatio: 0.3, // Fraction of messages to keep verbatim

    // Stage 4 (truncate) options
    truncationFraction: 0.5, // Fraction of messages to truncate

    // Provider hint for token estimation
    provider: "anthropic",
  },
);

if (result?.compacted) {
  console.log(`Saved ${result.tokensSaved} tokens`);
  console.log(`Stages used: ${result.stagesUsed.join(", ")}`);
  // result.stagesUsed is an array of: "prune" | "deduplicate" | "summarize" | "truncate"
}
```

**`CompactionConfig` Field Reference:**

| Field                   | Type       | Default              | Description                                             |
| ----------------------- | ---------- | -------------------- | ------------------------------------------------------- |
| `enablePrune`           | `boolean`  | `true`               | Enable Stage 1: tool output pruning                     |
| `enableDeduplicate`     | `boolean`  | `true`               | Enable Stage 2: file read deduplication                 |
| `enableSummarize`       | `boolean`  | `true`               | Enable Stage 3: LLM summarization                       |
| `enableTruncate`        | `boolean`  | `true`               | Enable Stage 4: sliding window truncation               |
| `pruneProtectTokens`    | `number`   | `40000`              | Number of recent tokens protected from pruning          |
| `pruneMinimumSavings`   | `number`   | `20000`              | Minimum token savings required to apply pruning         |
| `pruneProtectedTools`   | `string[]` | `["skill"]`          | Tool names whose outputs are never pruned               |
| `summarizationProvider` | `string`   | `"vertex"`           | Provider for LLM summarization                          |
| `summarizationModel`    | `string`   | `"gemini-2.5-flash"` | Model for LLM summarization                             |
| `keepRecentRatio`       | `number`   | `0.3`                | Fraction of messages kept verbatim during summarization |
| `truncationFraction`    | `number`   | `0.5`                | Fraction of oldest messages tagged as truncated         |
| `provider`              | `string`   | `""`                 | Provider hint for token estimation multipliers          |

#### File Token Budget Constants

These constants in `src/lib/context/fileTokenBudget.ts` control how file reads interact with the context budget:

| Constant                   | Value    | Description                                                    |
| -------------------------- | -------- | -------------------------------------------------------------- |
| `FILE_READ_BUDGET_PERCENT` | `0.6`    | Fraction of remaining context allocated for file reads         |
| `FILE_FAST_PATH_SIZE`      | `100 KB` | Files below this size skip budget validation                   |
| `FILE_PREVIEW_MODE_SIZE`   | `5 MB`   | Files above this size get preview-only mode (first 2000 chars) |
| `FILE_PREVIEW_CHARS`       | `2000`   | Number of characters shown in preview mode                     |

#### Tool Output Limits Constants

These constants in `src/lib/context/toolOutputLimits.ts` control tool output truncation:

| Constant                | Value           | Description                                 |
| ----------------------- | --------------- | ------------------------------------------- |
| `MAX_TOOL_OUTPUT_BYTES` | `51200` (50 KB) | Maximum tool output size before truncation  |
| `MAX_TOOL_OUTPUT_LINES` | `2000`          | Maximum tool output lines before truncation |

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
