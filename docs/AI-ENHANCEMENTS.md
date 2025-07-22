# 🚀 NeuroLink AI Enhancements - Complete Documentation

## Overview

NeuroLink v3.1.0 introduces 6 powerful AI enhancement features that transform it from a basic AI SDK into a comprehensive AI development platform with quality monitoring and analytics capabilities.

## 🆕 New Features

### 1. Response Quality Evaluation ⭐

AI-powered quality scoring using fast, cost-effective models to evaluate response quality on multiple dimensions.

**Metrics:**

- **Relevance** (1-10): How well the response addresses the prompt
- **Accuracy** (1-10): Factual correctness of the information
- **Completeness** (1-10): Whether the response fully answers the question
- **Overall** (1-10): Combined quality assessment

**Configuration:**

```bash
# Optional environment variables
NEUROLINK_EVALUATION_MODEL=gemini-2.5-flash
NEUROLINK_EVALUATION_PROVIDER=google-ai
```

### 2. Usage Analytics 📊

Comprehensive tracking of AI usage patterns, costs, and performance metrics.

**Metrics Captured:**

- Token usage (input, output, total)
- Estimated costs (based on provider pricing)
- Response time
- Provider and model used
- Custom context data
- Timestamp

**Supported Cost Estimation:**

- OpenAI (GPT-4, GPT-4 Turbo, GPT-3.5 Turbo)
- Anthropic (Claude 3 Opus, Sonnet, Haiku)
- Google AI (Gemini Pro, Gemini 2.5 Flash)

### 3. Generic Context Flow 🔄

Pass custom context objects through the entire AI request lifecycle for domain-specific tracking and analytics.

**Use Cases:**

- User identification (`userId`, `sessionId`)
- Domain-specific metadata (`department`, `project`)
- Request categorization (`priority`, `type`)
- Custom business logic data

### 4. Quality Monitoring 📈

Analytics and evaluation data returned in response objects for user-controlled alerting and monitoring.

**No External Dependencies:**

- All data stays within NeuroLink ecosystem
- Users control what to do with the data
- No forced external endpoints or webhooks

## 🛠️ SDK Usage

### Basic Usage with Analytics

```typescript
import { NeuroLink } from "@juspay/neurolink";

const sdk = new NeuroLink();

const result = await sdk.generate({
  input: { text: "Explain artificial intelligence in simple terms" },
  provider: "openai",
  enableAnalytics: true, // 🆕 NEW: Track usage and costs
  context: {
    // 🆕 NEW: Custom context
    userId: "user-123",
    department: "engineering",
    requestType: "explanation",
  },
});

console.log(result.content); // AI response
console.log(result.analytics); // Usage metrics
// {
//   provider: 'openai',
//   model: 'gpt-4o',
//   tokens: { input: 15, output: 150, total: 165 },
//   cost: 0.00495,  // Estimated cost in USD
//   responseTime: 2340,
//   timestamp: '2025-01-15T10:30:00.000Z',
//   context: { userId: 'user-123', department: 'engineering', requestType: 'explanation' }
// }
```

### Usage with Quality Evaluation

```typescript
const result = await sdk.generate({
  input: { text: "Write a technical explanation of machine learning" },
  provider: "google-ai",
  enableEvaluation: true, // 🆕 NEW: AI quality scoring
  context: {
    domain: "technology",
    audience: "technical",
    expectedLength: "detailed",
  },
});

console.log(result.evaluation);
// {
//   relevanceScore: 9,
//   accuracyScore: 8,
//   completenessScore: 9,
//   overallScore: 8.7,
//   evaluationModel: 'gemini-2.5-flash',
//   evaluationTime: 1200
// }
```

### Combined Analytics and Evaluation

```typescript
const result = await sdk.generate({
  input: { text: "Generate a product description for AI software" },
  enableAnalytics: true, // Track usage and costs
  enableEvaluation: true, // Score response quality
  context: {
    productId: "ai-toolkit-v2",
    userId: "marketing-001",
    campaign: "product-launch-2025",
  },
});

// Access all enhancement data
const { content, analytics, evaluation } = result;

// Custom monitoring logic
if (evaluation.overallScore < 7) {
  console.warn("Low quality response detected");
}

if (analytics.cost > 0.1) {
  console.warn("High cost request detected");
}

// Send to your monitoring system
sendToMonitoring({
  requestId: analytics.context.productId,
  quality: evaluation.overallScore,
  cost: analytics.cost,
  responseTime: analytics.responseTime,
});
```

## 🖥️ CLI Usage

### Analytics Tracking

```bash
# Enable analytics with debug output
npx @juspay/neurolink generate "Explain quantum computing" \
  --enable-analytics \
  --debug

# Output includes:
# - AI response text
# - Token usage details
# - Estimated costs
# - Response time
# - Provider information
```

### Quality Evaluation

```bash
# Enable response quality scoring
npx @juspay/neurolink generate "Write a business proposal" \
  --enable-evaluation \
  --debug

# Output includes:
# - AI response text
# - Quality scores (relevance, accuracy, completeness, overall)
# - Evaluation model used
# - Evaluation time
```

### Custom Context

```bash
# Pass custom context data
npx @juspay/neurolink generate "Help with customer issue" \
  --context '{"userId":"support-001","priority":"high","department":"customer-service"}' \
  --enable-analytics \
  --debug

# Context appears in analytics data for tracking
```

### All Features Combined

```bash
# Use all enhancement features together
npx @juspay/neurolink generate "Generate marketing copy for AI product" \
  --enable-analytics \
  --enable-evaluation \
  --context '{"campaign":"q1-2025","target":"developers","budget":"high"}' \
  --provider openai \
  --temperature 0.8 \
  --debug
```

### 5. Universal Evaluation System 🌐

Enterprise-grade multi-provider evaluation with intelligent fallback, cost optimization, and performance tuning.

**Key Features:**

- **9 Provider Support**: Google AI, OpenAI, Anthropic, Vertex, Bedrock, Azure, Ollama, Hugging Face, Mistral
- **Intelligent Fallback**: Automatic provider selection when primary fails
- **Cost Optimization**: Provider-specific cost calculations and budget awareness
- **Performance Modes**: Fast, balanced, and quality evaluation options
- **Retry Logic**: Robust error handling with exponential backoff

**Configuration:**

```bash
# Primary evaluation setup
NEUROLINK_EVALUATION_PROVIDER=google-ai
NEUROLINK_EVALUATION_MODE=fast
NEUROLINK_EVALUATION_FALLBACK_ENABLED=true
NEUROLINK_EVALUATION_FALLBACK_PROVIDERS=openai,anthropic,vertex

# Cost optimization
NEUROLINK_EVALUATION_PREFER_CHEAP=true
NEUROLINK_EVALUATION_MAX_COST_PER_EVAL=0.01

# Performance tuning
NEUROLINK_EVALUATION_TIMEOUT=10000
NEUROLINK_EVALUATION_RETRY_ATTEMPTS=2
```

**Usage:**

```typescript
// Automatic provider selection
const result = await sdk.generate({
  input: { text: "Explain quantum computing" },
  enableEvaluation: true, // Uses configured evaluation system
});

// Will try: google-ai → openai → anthropic → vertex (if primary fails)
```

**CLI Usage:**

```bash
# Uses Universal Evaluation System automatically
npx @juspay/neurolink generate "What is machine learning?" --enable-evaluation

# With debug to see provider selection
npx @juspay/neurolink generate "Explain AI" --enable-evaluation --debug
```

### 6. Lighthouse Enhanced Evaluation 🎯

Domain-aware evaluation with 6-dimensional scoring based on Lighthouse AI platform patterns.

**Enhanced Scoring Dimensions:**

- **Relevance Score** (1-10): How well response addresses the prompt
- **Accuracy Score** (1-10): Factual correctness of information
- **Completeness Score** (1-10): Whether response fully answers question
- **Domain Alignment** (1-10): Expertise alignment with specified domain
- **Terminology Accuracy** (1-10): Proper use of domain-specific terms
- **Tool Effectiveness** (1-10): How well MCP tools were utilized

**Advanced Features:**

- **Context Integration**: Tool usage tracking and conversation history
- **Domain Expertise**: Specialized evaluation prompts for specific domains
- **Enterprise Telemetry**: Structured logging with OpenTelemetry patterns
- **Backward Compatibility**: Full compatibility with Universal Evaluation System

**CLI Usage:**

```bash
# Basic Lighthouse-style evaluation
npx @juspay/neurolink generate "Fix this Python code" \
  --lighthouse-style \
  --evaluation-domain "Python coding assistant"

# Enterprise evaluation with full context
npx @juspay/neurolink generate "Analyze sales performance" \
  --lighthouse-style \
  --evaluation-domain "Business data analyst" \
  --tool-usage-context "Used sales-data and analytics MCP tools" \
  --context '{"role":"senior_analyst","department":"sales"}'
```

**SDK Usage:**

```typescript
import {
  performEnhancedEvaluation,
  createEnhancedContext,
} from "@juspay/neurolink";

// Create enhanced evaluation context
const enhancedContext = createEnhancedContext(
  "Write a business proposal for Q1 expansion",
  result.text,
  {
    domain: "Business development",
    role: "Business proposal assistant",
    toolsUsed: ["generate", "analytics-helper"],
    conversationHistory: [
      { role: "user", content: "I need help with our Q1 business plan" },
      {
        role: "assistant",
        content: "I can help you create a comprehensive plan",
      },
    ],
  },
);

// Perform enhanced evaluation
const domainEvaluation = await performEnhancedEvaluation(enhancedContext);
console.log("🎯 Enhanced Evaluation:", domainEvaluation);
// {
//   relevanceScore: 9, accuracyScore: 8, completenessScore: 9,
//   domainAlignment: 9, terminologyAccuracy: 8, toolEffectiveness: 9,
//   overall: 8.7, alertSeverity: 'none'
// }
```

## 📋 Interface Reference

### Enhanced TextGenerationOptions

```typescript
interface TextGenerationOptions {
  // Existing fields (unchanged)
  input: { text: string };
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  timeout?: number | string;
  disableTools?: boolean;

  // 🆕 NEW: AI Enhancement fields
  enableAnalytics?: boolean; // Default: false
  enableEvaluation?: boolean; // Default: false
  context?: Record<string, any>; // Default: undefined
}
```

### AnalyticsData Structure

```typescript
interface AnalyticsData {
  provider: string; // AI provider used
  model: string; // Specific model name
  tokens: {
    input: number; // Input tokens
    output: number; // Output tokens
    total: number; // Total tokens
  };
  cost?: number; // Estimated cost (USD)
  responseTime: number; // Response time (ms)
  timestamp: string; // ISO timestamp
  context?: Record<string, any>; // User context
}
```

### EvaluationData Structure

```typescript
interface EvaluationData {
  relevanceScore: number; // 1-10 scale
  accuracyScore: number; // 1-10 scale
  completenessScore: number; // 1-10 scale
  overallScore: number; // 1-10 scale
  evaluationModel: string; // Model used for evaluation
  evaluationTime: number; // Evaluation time (ms)
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Response Quality Evaluation (optional)
NEUROLINK_EVALUATION_MODEL=gemini-2.5-flash
NEUROLINK_EVALUATION_PROVIDER=google-ai

# Provider API Keys (existing)
OPENAI_API_KEY=sk-your-openai-key
GOOGLE_AI_API_KEY=AIza-your-google-ai-key
AWS_ACCESS_KEY_ID=your-aws-access-key
# ... other provider keys
```

### Cost Estimation Configuration

Built-in pricing for major providers (updated regularly):

```typescript
const costMap = {
  openai: {
    "gpt-4": { input: 0.03, output: 0.06 },
    "gpt-4-turbo": { input: 0.01, output: 0.03 },
    "gpt-3.5-turbo": { input: 0.0015, output: 0.002 },
  },
  anthropic: {
    "claude-3-opus": { input: 0.015, output: 0.075 },
    "claude-3-sonnet": { input: 0.003, output: 0.015 },
    "claude-3-haiku": { input: 0.00025, output: 0.00125 },
  },
  "google-ai": {
    "gemini-pro": { input: 0.00035, output: 0.00105 },
    "gemini-2.5-flash": { input: 0.000075, output: 0.0003 },
  },
};
```

## 🚀 Performance Considerations

### Performance Impact

- **Features Disabled (default)**: Zero overhead
- **Analytics Only**: <5ms additional processing
- **Evaluation Only**: Depends on evaluation model (recommend fast models)
- **Both Enabled**: Minimal combined impact

### Cost Optimization

- **Analytics**: No additional API costs (local processing)
- **Evaluation**: Additional API calls to evaluation model
- **Recommendation**: Use fast, cheap models like Gemini 2.5 Flash for evaluation

### Scaling Recommendations

- Use analytics for all production requests
- Use evaluation for critical or customer-facing content
- Implement sampling for high-volume applications
- Cache evaluation results for similar prompts

## 🛡️ Security & Privacy

- **No External Transmission**: All data stays within NeuroLink ecosystem
- **User Control**: You decide what to do with analytics/evaluation data
- **Context Security**: Context objects support any data format you control
- **Provider Security**: Same security model as existing NeuroLink providers

## 🔄 Migration Guide

### From v3.0.x to v3.1.x

**Zero Breaking Changes!** All existing code continues to work unchanged.

```typescript
// Legacy approach (still works)
const result = await sdk.generate({
  input: { text: "Hello world" },
  provider: "openai",
});

// Modern approach with enhancements (recommended)
const result = await sdk.generate({
  input: { text: "Hello world" },
  provider: "openai",
  enableAnalytics: true, // Add analytics
  enableEvaluation: true, // Add evaluation
  context: { userId: "123" }, // Add context
});
```

### CLI Migration

```bash
# Existing commands (unchanged)
npx @juspay/neurolink generate "Hello world"

# Enhanced commands (new flags)
npx @juspay/neurolink generate "Hello world" --enable-analytics
npx @juspay/neurolink generate "Hello world" --enable-evaluation
npx @juspay/neurolink generate "Hello world" --context '{"key":"value"}'
```

## 📚 Examples & Use Cases

### Customer Support Analytics

```typescript
const result = await sdk.generate({
  input: { text: customerQuery },
  enableAnalytics: true,
  enableEvaluation: true,
  context: {
    customerId: customer.id,
    priority: ticket.priority,
    department: "support",
    agent: agent.id,
  },
});

// Track support quality and costs
trackSupportMetrics({
  ticketId: ticket.id,
  responseQuality: result.evaluation.overallScore,
  cost: result.analytics.cost,
  responseTime: result.analytics.responseTime,
});
```

### Content Generation Pipeline

```typescript
const results = await Promise.all([
  sdk.generate({
    input: { text: "Write blog title" },
    enableEvaluation: true,
    context: { contentType: "title", campaign: "q1-launch" },
  }),
  sdk.generate({
    input: { text: "Write blog intro" },
    enableEvaluation: true,
    context: { contentType: "intro", campaign: "q1-launch" },
  }),
  sdk.generate({
    input: { text: "Write blog conclusion" },
    enableEvaluation: true,
    context: { contentType: "conclusion", campaign: "q1-launch" },
  }),
]);

// Quality gate: only publish high-quality content
const highQualityContent = results.filter(
  (r) => r.evaluation.overallScore >= 8,
);
```

### Cost Monitoring Dashboard

```typescript
function createCostDashboard() {
  const dailyCosts = [];
  const qualityMetrics = [];

  // Track all AI requests
  sdk.onResponse((result) => {
    if (result.analytics) {
      dailyCosts.push({
        date: new Date(result.analytics.timestamp),
        cost: result.analytics.cost,
        provider: result.analytics.provider,
        tokens: result.analytics.tokens.total,
      });
    }

    if (result.evaluation) {
      qualityMetrics.push({
        date: new Date(),
        quality: result.evaluation.overallScore,
        prompt: result.analytics?.context?.promptType,
      });
    }
  });
}
```

## 🎯 Best Practices

1. **Enable Analytics by Default**: Track all production usage
2. **Selective Evaluation**: Use for critical or customer-facing content
3. **Meaningful Context**: Include user/session IDs for tracking
4. **Quality Thresholds**: Set minimum quality scores for auto-publish
5. **Cost Alerts**: Monitor spending with custom thresholds
6. **Performance Monitoring**: Track response times and token usage
7. **A/B Testing**: Use context to track different prompt strategies

---

_NeuroLink AI Enhancements v3.1.0 - Transform your AI applications with comprehensive quality monitoring and analytics._
