# Analytics & Evaluation

Advanced analytics and AI response evaluation features for monitoring usage, performance, and quality.

## 🎯 Overview

NeuroLink provides comprehensive analytics and evaluation capabilities to help you monitor AI usage, track performance, and assess response quality. These features are essential for production applications and enterprise deployments.

## 📊 Analytics Features

### Usage Analytics

Track detailed metrics about your AI interactions:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  analytics: {
    enabled: true,
    endpoint: "https://analytics.yourcompany.com",
    apiKey: process.env.ANALYTICS_API_KEY,
  },
});

// Analytics automatically tracked
const result = await neurolink.generate({
  input: { text: "Generate report" },
  context: {
    userId: "user123",
    sessionId: "sess456",
    department: "engineering",
  },
});
```

### CLI Analytics

Enable analytics in CLI commands:

```bash
# Enable analytics for single command
npx @juspay/neurolink gen "Analyze data" --enable-analytics

# With custom context
npx @juspay/neurolink gen "Business analysis" \
  --enable-analytics \
  --context '{"team":"product","project":"dashboard"}' \
  --debug
```

### Tracked Metrics

- **Usage Statistics**: Request count, frequency, patterns
- **Performance Metrics**: Response time, token usage, costs
- **Provider Statistics**: Success rates, error patterns, latency
- **Cost Analysis**: Per-provider costs, budget tracking
- **User Analytics**: Usage by user, team, or department
- **Quality Metrics**: Response evaluation scores

## 🔍 Response Evaluation

### AI-Powered Quality Assessment

```typescript
// Enable evaluation for quality scoring
const result = await neurolink.generate({
  input: { text: "Write production code" },
  enableEvaluation: true,
  evaluationDomain: "Senior Software Engineer",
  evaluationCriteria: ["accuracy", "completeness"],
});

console.log(result.evaluation);
// {
//   overall: 9.2,
//   relevance: 9.5,
//   accuracy: 9.0,
//   completeness: 8.8,
//   reasoning: "Code follows best practices...",
//   alertSeverity: "none"
// }
```

### CLI Evaluation

```bash
# Basic evaluation
npx @juspay/neurolink gen "Write API documentation" --enable-evaluation

# Domain-specific evaluation
npx @juspay/neurolink gen "Design system architecture" \
  --enable-evaluation \
  --evaluation-domain "Solutions Architect"

# Combined analytics and evaluation
npx @juspay/neurolink gen "Create test plan" \
  --enable-analytics \
  --enable-evaluation \
  --evaluation-domain "QA Engineer" \
  --debug
```

### Evaluation Domains

Specialized evaluation contexts:

- **Technical**: `Senior Software Engineer`, `DevOps Specialist`, `Data Scientist`
- **Business**: `Product Manager`, `Business Analyst`, `Marketing Manager`
- **Creative**: `Content Writer`, `UX Designer`, `Creative Director`
- **Academic**: `Research Scientist`, `Technical Writer`, `Educator`

## 📈 Analytics Collection

### Per-Request Analytics

Analytics are collected on a per-request basis and included in each result:

```typescript
// Enable analytics for a single request
const result = await neurolink.generate({
  input: { text: "Generate documentation" },
  enableAnalytics: true,
});

// Access analytics from the result
console.log(result.analytics);
// {
//   totalTokens: 1523,
//   promptTokens: 421,
//   completionTokens: 1102,
//   cost: 0.0045,
//   durationMs: 1456,
//   provider: "openai",
//   model: "gpt-4o"
// }
```

### Middleware-Based Analytics

For application-wide analytics collection, use the analytics middleware:

```typescript
import {
  getAnalyticsMetrics,
  clearAnalyticsMetrics,
} from "@juspay/neurolink/middleware/builtin/analytics";

// Analytics are automatically collected by the middleware
const metrics = getAnalyticsMetrics();

// Process or export metrics as needed
console.log(metrics);

// Clear metrics after processing
clearAnalyticsMetrics();
```

## 🔧 Configuration

### Environment Variables

```bash
# Evaluation Configuration
NEUROLINK_EVALUATION_PROVIDER="google-ai"
NEUROLINK_EVALUATION_MODEL="gemini-2.5-flash"
NEUROLINK_EVALUATION_THRESHOLD="7"
```

### Per-Request Configuration

Analytics and evaluation are configured on a per-request basis:

```typescript
// Enable analytics and evaluation for specific requests
const result = await neurolink.generate({
  input: { text: "Your prompt" },
  enableAnalytics: true,
  enableEvaluation: true,
  evaluationDomain: "Senior Software Engineer",
  evaluationCriteria: ["accuracy", "completeness"],
});
```

## 📊 Currently Available Methods

The following methods are available today for analytics and monitoring:

| Method                                 | Description                                       |
| -------------------------------------- | ------------------------------------------------- |
| `neurolink.getProviderStatus()`        | Get provider availability status                  |
| `neurolink.getProviderHealthSummary()` | Get health summary for all providers              |
| `neurolink.getToolExecutionMetrics()`  | Get tool execution statistics                     |
| `getAnalyticsMetrics()`                | Standalone middleware function for analytics data |

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { getAnalyticsMetrics } from "@juspay/neurolink/middleware/builtin/analytics";

const neurolink = new NeuroLink();

// Get provider health status
const healthSummary = neurolink.getProviderHealthSummary();
console.log(healthSummary);

// Get tool execution metrics
const toolMetrics = neurolink.getToolExecutionMetrics();
console.log(toolMetrics);

// Get analytics from middleware
const metrics = getAnalyticsMetrics();
console.log(metrics);
```

---

## 📊 Use Cases

> **Planned Feature**
>
> The following methods (`getProviderMetrics()`, `getCostAnalysis()`, `getTeamAnalytics()`) are planned for a future release and are **not yet available** in the current SDK version.
> These examples illustrate the planned API design.

### Planned API: Performance Monitoring

```typescript
// PLANNED - Monitor provider performance
const perfMetrics = await neurolink.getProviderMetrics({
  providers: ["openai", "google-ai", "anthropic"],
  timeRange: "last_24_hours",
  metrics: ["response_time", "success_rate", "cost_per_token"],
});

// Identify best performing provider
const bestProvider = perfMetrics.providers.sort(
  (a, b) => a.averageResponseTime - b.averageResponseTime,
)[0];

console.log(`Best provider: ${bestProvider.name}`);
```

### Planned API: Cost Optimization

```typescript
// PLANNED - Track costs and optimize
const costAnalysis = await neurolink.getCostAnalysis({
  timeRange: "current_month",
  groupBy: ["provider", "model", "user_id"],
});

// Find cost-effective providers
const cheapestProvider = costAnalysis.providers.sort(
  (a, b) => a.costPerToken - b.costPerToken,
)[0];
```

### Quality Assurance

```bash
# Batch evaluate responses for quality
cat prompts.txt | while read prompt; do
  npx @juspay/neurolink gen "$prompt" \
    --enable-evaluation \
    --evaluation-domain "Senior Engineer" \
    --json >> evaluations.json
done

# Analyze quality trends
jq '.evaluation.overall' evaluations.json | awk '{sum+=$1} END {print "Average quality:", sum/NR}'
```

## 🚀 Enterprise Features

> **Planned Feature**
>
> The enterprise analytics methods below (`getTeamAnalytics()`, custom metrics configuration) are planned for a future release.
> These examples illustrate the planned API design for enterprise deployments.

### Planned API: Team Analytics

```typescript
// PLANNED - Department-level analytics
const teamMetrics = await neurolink.getTeamAnalytics({
  departments: ["engineering", "product", "marketing"],
  metrics: ["usage", "cost", "quality_scores"],
  timeRange: "current_quarter",
});
```

### Planned API: Custom Metrics

```typescript
// PLANNED - Define custom analytics
const result = await neurolink.generate({
  input: { text: "Generate report" },
  analytics: {
    customMetrics: {
      feature: "report_generation",
      complexity: "high",
      businessValue: "critical",
    },
  },
});
```

### Compliance Monitoring

```bash
# Audit trail with evaluation
npx @juspay/neurolink gen "Sensitive analysis" \
  --enable-analytics \
  --enable-evaluation \
  --context '{"compliance":"required","audit":"true"}' \
  --evaluation-domain "Compliance Officer"
```

## 📚 Related Documentation

- [CLI Commands](../cli/commands.md) - Analytics CLI commands
- [Environment Variables](../getting-started/environment-variables.md) - Configuration
- [SDK Reference](../sdk/api-reference.md) - Programmatic analytics
- [Enterprise Setup](../advanced/enterprise.md) - Enterprise features
