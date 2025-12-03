# Advanced AI Model Orchestration

## Overview

The Advanced Orchestration feature provides intelligent routing between AI models based on task characteristics. It automatically analyzes incoming prompts and routes them to the most suitable provider and model combination for optimal performance and cost efficiency.

## Key Features

### 🧠 Binary Task Classification

- **Fast Tasks**: Simple queries, calculations, quick facts → Routed to Vertex AI Gemini 2.5 Flash
- **Reasoning Tasks**: Complex analysis, philosophical questions, detailed explanations → Routed to Vertex AI Claude Sonnet 4

### ⚡ Intelligent Model Routing

- Automatic provider and model selection based on task type
- Optimizes for response speed vs. reasoning capability
- Built-in confidence scoring for classification accuracy

### 🎯 Precedence Hierarchy

1. **User-specified provider/model** (highest priority)
2. **Orchestration routing** (when no provider specified)
3. **Auto provider selection** (fallback)
4. **Graceful error handling**

### 🔄 Zero Breaking Changes

- Completely optional feature (disabled by default)
- Existing functionality preserved
- Backward compatible with all existing code

## Usage

### Basic Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Enable orchestration
const neurolink = new NeuroLink({
  enableOrchestration: true,
});

// Fast task - automatically routed to Gemini Flash
const quickResult = await neurolink.generate({
  input: { text: "What's 2+2?" },
});
// → Uses vertex/gemini-2.5-flash

// Reasoning task - automatically routed to Claude Sonnet 4
const analysisResult = await neurolink.generate({
  input: { text: "Analyze the philosophical implications of AI consciousness" },
});
// → Uses vertex/claude-sonnet-4@20250514
```

### Advanced Usage

```typescript
// User-specified provider overrides orchestration
const result = await neurolink.generate({
  input: { text: "Quick math question" },
  provider: "openai", // This takes priority over orchestration
});
// → Uses openai regardless of task classification

// Orchestration disabled (default behavior)
const neurolinkDefault = new NeuroLink();
const result = await neurolinkDefault.generate({
  input: { text: "Any question" },
});
// → Uses auto provider selection (no orchestration)
```

### Manual Classification and Routing

```typescript
import { BinaryTaskClassifier, ModelRouter } from "@juspay/neurolink";

// Manual task classification
const classification = BinaryTaskClassifier.classify(
  "Explain quantum mechanics",
);
console.log(classification);
// → { type: 'reasoning', confidence: 0.95, reasoning: '...' }

// Manual model routing
const route = ModelRouter.route("What's the weather?");
console.log(route);
// → { provider: 'vertex', model: 'gemini-2.5-flash', confidence: 0.95, reasoning: '...' }
```

## Task Classification Logic

### Fast Tasks (→ Gemini 2.5 Flash)

- **Short prompts** (< 50 characters)
- **Keywords**: quick, fast, simple, what, time, weather, calculate, translate
- **Patterns**: Questions, calculations, greetings, simple requests
- **Examples**:
  - "What's 2+2?"
  - "Current time?"
  - "Quick weather update"
  - "Translate 'hello' to Spanish"

### Reasoning Tasks (→ Claude Sonnet 4)

- **Complex prompts** (detailed analysis requests)
- **Keywords**: analyze, explain, compare, design, strategy, implications, philosophy, complex
- **Patterns**: Analysis requests, philosophical questions, strategy development
- **Examples**:
  - "Analyze the ethical implications of AI in healthcare"
  - "Compare different economic theories"
  - "Design a comprehensive climate strategy"
  - "Explain the philosophical implications of consciousness"

## Configuration Options

### Constructor Options

```typescript
interface NeuroLinkConfig {
  enableOrchestration?: boolean; // Default: false
  conversationMemory?: {
    enabled?: boolean;
    maxSessions?: number;
    maxTurnsPerSession?: number;
  };
}

const neurolink = new NeuroLink({
  enableOrchestration: true,
  conversationMemory: {
    enabled: true,
    maxSessions: 100,
  },
});
```

### Environment Variables

The orchestration system uses unified Vertex AI for both fast and reasoning tasks:

```bash
# Vertex AI (for both fast and reasoning tasks)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-east5  # REQUIRED for Claude models (us-east5, europe-west1

# Models are automatically selected:
# - Fast tasks: gemini-2.5-flash
# - Reasoning tasks: claude-sonnet-4@20250514

# IMPORTANT: Claude models are only available in specific regions:
# - us-east5 (recommended)
# - europe-west1
# - asia-east1
# Default region us-central1 does NOT support Claude models
```

## Architecture

### Components

1. **BinaryTaskClassifier**: Analyzes prompts and classifies as 'fast' or 'reasoning'
2. **ModelRouter**: Maps task types to optimal provider/model combinations
3. **NeuroLink Integration**: Orchestration logic integrated into main generation flow
4. **Precedence Engine**: Handles priority between user preferences and orchestration

### Flow Diagram

```
User Request
     ↓
enableOrchestration? → No → Auto Provider Selection
     ↓ Yes
Provider/Model Specified? → Yes → Use Specified
     ↓ No
BinaryTaskClassifier
     ↓
Task Type: Fast | Reasoning
     ↓
ModelRouter
     ↓
Provider: vertex | vertex
Model: gemini-2.5-flash | claude-sonnet-4@20250514
     ↓
AI Generation
```

### Error Handling

- **Orchestration Failure**: Falls back to auto provider selection
- **Provider Unavailable**: Uses next best available provider
- **Classification Errors**: Defaults to fast task routing
- **Network Issues**: Standard NeuroLink retry mechanisms apply

## Performance

### Response Time Optimization

- **Fast tasks**: Target <2s response time with Gemini Flash
- **Reasoning tasks**: Accept longer response time for better quality with Claude Sonnet 4
- **Classification overhead**: <10ms per request
- **Routing overhead**: <5ms per request

### Cost Optimization

- **Fast tasks**: Use cost-effective Gemini Flash for simple queries
- **Reasoning tasks**: Use premium Claude Sonnet 4 for complex analysis
- **Automatic scaling**: Route based on complexity, not user preference

## Monitoring and Analytics

### Built-in Logging

```typescript
// Enable debug logging to see orchestration decisions
import { logger } from "@juspay/neurolink";
logger.setLogLevel("debug");

const result = await neurolink.generate({
  input: { text: "Complex analysis request" },
});

// Console output:
// [DEBUG] Orchestration applied: reasoning -> vertex/claude-sonnet-4@20250514
// [DEBUG] Classification confidence: 0.95
// [DEBUG] Routing reasoning: Complex analysis patterns detected
```

Alternative: Set environment variable before running your application:

```bash
NEUROLINK_DEBUG=true node your-app.js
```

### Event Monitoring

```typescript
const emitter = neurolink.getEventEmitter();

emitter.on("generation:start", (event) => {
  console.log(`Generation started with provider: ${event.provider}`);
});

emitter.on("generation:end", (event) => {
  console.log(`Generation completed in ${event.responseTime}ms`);
  console.log(`Tools used: ${event.toolsUsed?.length || 0}`);
});
```

## Best Practices

### When to Enable Orchestration

✅ **Good use cases**:

- Mixed workloads (both simple and complex queries)
- Cost optimization important
- Response time optimization for simple queries
- Large-scale applications with varied request types

❌ **Not recommended**:

- Single-purpose applications (all fast or all reasoning)
- When you need consistent provider behavior
- Testing/development with specific models
- Applications requiring strict provider control

### Optimization Tips

1. **Trust the Classification**: The binary classifier is highly accurate (>95% confidence)
2. **Use Precedence**: Override orchestration when you need specific behavior
3. **Monitor Performance**: Track response times and adjust if needed
4. **Combine with Analytics**: Use `enableAnalytics: true` to track usage patterns

### Integration Patterns

```typescript
// Pattern 1: Smart Defaults with Override Capability
const smartNeurolink = new NeuroLink({ enableOrchestration: true });

async function smartGenerate(prompt: string, forceProvider?: string) {
  return await smartNeurolink.generate({
    input: { text: prompt },
    provider: forceProvider, // Override when needed
    enableAnalytics: true, // Track usage
  });
}

// Pattern 2: Hybrid Approach
class SmartAIService {
  private orchestratedClient = new NeuroLink({ enableOrchestration: true });
  private controlledClient = new NeuroLink({ enableOrchestration: false });

  async generateSmart(prompt: string) {
    return await this.orchestratedClient.generate({ input: { text: prompt } });
  }

  async generateControlled(prompt: string, provider: string) {
    return await this.controlledClient.generate({
      input: { text: prompt },
      provider,
    });
  }
}
```

## Migration Guide

### From Standard NeuroLink

```typescript
// Before (unchanged)
const neurolink = new NeuroLink();
const result = await neurolink.generate({
  input: { text: "Any question" },
});

// After (with orchestration)
const neurolink = new NeuroLink({ enableOrchestration: true });
const result = await neurolink.generate({
  input: { text: "Any question" }, // Now automatically optimized
});
```

### Gradual Adoption

```typescript
// Phase 1: Test with specific requests
const orchestratedNeurolink = new NeuroLink({ enableOrchestration: true });
const testResult = await orchestratedNeurolink.generate({
  input: { text: "test prompt" },
});

// Phase 2: Feature flag approach
const useOrchestration = process.env.ENABLE_SMART_ROUTING === "true";
const neurolink = new NeuroLink({ enableOrchestration: useOrchestration });

// Phase 3: Full adoption
const neurolink = new NeuroLink({ enableOrchestration: true });
```

## Troubleshooting

### Common Issues

**Issue**: Orchestration not working

```typescript
// Check if orchestration is enabled
const neurolink = new NeuroLink({ enableOrchestration: true });
console.log(neurolink.enableOrchestration); // Should be true
```

**Issue**: Wrong provider selected

```typescript
// Use manual classification to debug
const classification = BinaryTaskClassifier.classify("your prompt");
console.log(classification);
// Check if classification matches expectation
```

**Issue**: Performance concerns

```typescript
// Monitor orchestration overhead
const startTime = Date.now();
const result = await neurolink.generate({ input: { text: "prompt" } });
console.log(`Total time: ${Date.now() - startTime}ms`);
// Classification + routing should add <15ms
```

### Debug Mode

```typescript
// Enable detailed orchestration logging
import { logger } from "@juspay/neurolink";
logger.setLogLevel("debug");

const result = await neurolink.generate({
  input: { text: "debug this request" },
});
```

## API Reference

### BinaryTaskClassifier

```typescript
class BinaryTaskClassifier {
  static classify(text: string): {
    type: "fast" | "reasoning";
    confidence: number; // 0.0 - 1.0
    reasoning: string; // Human-readable explanation
  };
}
```

### ModelRouter

```typescript
class ModelRouter {
  static route(text: string): {
    provider: string; // 'vertex' | 'openai'
    model: string; // Model name
    confidence: number; // 0.0 - 1.0
    reasoning: string; // Human-readable explanation
  };
}
```

### NeuroLink Constructor

```typescript
interface NeuroLinkConfig {
  enableOrchestration?: boolean;
  conversationMemory?: Partial<ConversationMemoryConfig>;
}

class NeuroLink {
  constructor(config?: NeuroLinkConfig);
}
```

## Version History

- **v7.31.0**: Initial implementation of Advanced Orchestration
  - Binary task classification
  - Intelligent model routing
  - Zero breaking changes
  - Comprehensive testing and validation

## Support

For questions, issues, or feature requests related to Advanced Orchestration:

1. Check this documentation first
2. Review the troubleshooting section
3. Run the POC validation test: `node test-orchestration-poc.js`
4. Open an issue on the NeuroLink repository

---

_Advanced Orchestration is a powerful feature that makes AI model selection intelligent and automatic. Use it to optimize both performance and costs while maintaining full control when needed._
