# Dynamic Model Configuration System

This document describes the new dynamic model configuration system that replaces static enums with flexible, runtime-configurable model definitions.

## 🎯 Overview

The dynamic model system enables:

- **Runtime model discovery** from external configuration sources
- **Automatic fallback** to local configurations when external sources fail
- **Smart model resolution** with fuzzy matching and aliases
- **Capability-based search** to find models with specific features
- **Cost optimization** by automatically selecting cheapest models for tasks

## 🏗️ Architecture

### Components

1. **Model Configuration Server** (`scripts/model-server.js`)

   - Serves model configurations via REST API
   - Provides search and filtering capabilities
   - Can be hosted anywhere (GitHub, CDN, internal server)

2. **Dynamic Model Provider** (`src/lib/core/dynamicModels.ts`)

   - Loads configurations from multiple sources with fallback
   - Caches configurations to reduce network requests
   - Validates configurations using Zod schemas
   - Provides intelligent model resolution

3. **Model Configuration** (`config/models.json`)
   - JSON-based model definitions
   - Includes pricing, capabilities, and metadata
   - Supports aliases and provider defaults

## 🚀 Quick Start

### 1. Environment Setup

Before using the dynamic model system, ensure your provider configurations are set up correctly. See the [Provider Configuration Guide](./getting-started/provider-setup.md) for detailed instructions.

### 1. Start the Model Server

```bash
# Start the configuration server
npm run model-server

# Or manually
node scripts/model-server.js
```

Server runs on `http://localhost:3001` by default.

### 2. Test the System

```bash
# Run comprehensive tests
npm run test:dynamicModels

# Or manually
node test-dynamicModels.js
```

### 3. Use in Code

```typescript
import { dynamicModelProvider } from "./src/lib/core/dynamicModels.js";

// Initialize the provider
await dynamicModelProvider.initialize();

// Resolve a model
const model = dynamicModelProvider.resolveModel("anthropic", "claude-3-opus");

// Search by capability
const visionModels = dynamicModelProvider.searchByCapability("vision");

// Get best model for use case
const bestCodingModel = dynamicModelProvider.getBestModelFor("coding");
```

## 📡 API Endpoints

### Model Server Endpoints

- `GET /health` - Health check
- `GET /api/v1/models` - Get all model configurations
- `GET /api/v1/models/:provider` - Get models for specific provider
- `GET /api/v1/search?capability=X&maxPrice=Y` - Search models by criteria

### Example API Usage

```bash
# Get all models
curl http://localhost:3001/api/v1/models

# Get OpenAI models
curl http://localhost:3001/api/v1/models/openai

# Search for functionCalling models under $0.001
curl "http://localhost:3001/api/v1/search?capability=functionCalling&maxPrice=0.001"
```

## 🔧 Configuration Schema

### Model Configuration Structure

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-06-18T12:00:00Z",
  "models": {
    "anthropic": {
      "claude-3-opus": {
        "id": "claude-3-opus-20240229",
        "displayName": "Claude 3 Opus",
        "capabilities": ["functionCalling", "vision", "analysis"],
        "deprecated": false,
        "pricing": { "input": 0.015, "output": 0.075 },
        "contextWindow": 200000,
        "releaseDate": "2024-02-29"
      }
    }
  },
  "aliases": {
    "claude-latest": "anthropic/claude-3-opus",
    "best-coding": "anthropic/claude-3-opus"
  },
  "defaults": {
    "anthropic": "claude-3-sonnet"
  }
}
```

### Key Fields

- **`id`**: Provider-specific model identifier
- **`displayName`**: Human-readable model name
- **`capabilities`**: Array of model capabilities (functionCalling, vision, etc.)
- **`deprecated`**: Whether the model is deprecated
- **`pricing`**: Input/output token costs per 1K tokens
- **`contextWindow`**: Maximum context window size
- **`releaseDate`**: Model release date

## 🎛️ Advanced Usage

### Configuration Sources

The system tries multiple sources in order:

1. `process.env.MODEL_CONFIG_URL` - Custom URL override
2. `http://localhost:3001/api/v1/models` - Local development server
3. `https://raw.githubusercontent.com/juspay/neurolink/release/config/models.json` - GitHub
4. `./config/models.json` - Local fallback

### Model Resolution Logic

```typescript
// Exact match
resolveModel("anthropic", "claude-3-opus");

// Default model for provider
resolveModel("anthropic"); // Uses defaults.anthropic

// Alias resolution
resolveModel("anthropic", "claude-latest"); // Resolves alias

// Fuzzy matching
resolveModel("anthropic", "opus"); // Matches 'claude-3-opus'
```

### Capability Search Options

```typescript
searchByCapability("functionCalling", {
  provider: "openai", // Filter by provider
  maxPrice: 0.001, // Maximum input price per 1K tokens
  excludeDeprecated: true, // Exclude deprecated models
});
```

## 🔄 Migration from Static Enums

### Before (Static Enums)

```typescript
export enum BedrockModels {
  CLAUDE_3_SONNET = "anthropic.claude-3-sonnet-20240229-v1:0",
  // Hard to maintain, becomes stale
}
```

### After (Dynamic Resolution)

```typescript
// Backward compatible aliases
export const ModelAliases = {
  CLAUDE_LATEST: () =>
    dynamicModelProvider.resolveModel("anthropic", "claude-3"),
  GPT_LATEST: () => dynamicModelProvider.resolveModel("openai", "gpt-4"),
  BEST_CODING: () => dynamicModelProvider.getBestFor("coding"),
} as const;

// Usage stays the same
const provider = AIProviderFactory.createProvider(
  "anthropic",
  ModelAliases.CLAUDE_LATEST(),
);
```

## 🔐 Production Deployment

### Environment Variables

```bash
# Custom model configuration URL
MODEL_CONFIG_URL=https://api.yourcompany.com/ai/models

# Server port (default: 3001)
MODEL_SERVER_PORT=8080
```

### Hosting Configuration

1. **GitHub Pages**: Host `models.json` as static file
2. **CDN**: Use CloudFlare/AWS CloudFront for global distribution
3. **Internal API**: Integrate with existing infrastructure
4. **File System**: Local configurations for air-gapped environments

### Cache Strategy

- **5-minute cache**: Balances freshness with performance
- **Graceful degradation**: Falls back to cached data on network failures
- **Manual refresh**: `dynamicModelProvider.refresh()` for immediate updates

## 🧪 Testing

The test suite verifies:

✅ Model provider initialization
✅ Configuration loading from multiple sources
✅ Model resolution (exact, default, fuzzy, alias)
✅ Capability-based search
✅ Best model selection algorithms
✅ Error handling and fallbacks

Run tests with:

```bash
npm run test:dynamicModels
```

## 🚀 Benefits

- **🔄 Future-Proof**: New models automatically available
- **💰 Cost-Optimized**: Runtime selection based on pricing
- **🛡️ Reliable**: Multiple fallback sources
- **⚡ Fast**: Cached configurations with smart invalidation
- **🔒 Type-Safe**: Zod schemas ensure runtime safety
- **🔧 Backward Compatible**: Existing code continues working

This system transforms static model definitions into a dynamic, self-updating platform that scales with the rapidly evolving AI landscape.
