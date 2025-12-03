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
  evaluation: {
    enabled: true,
    domain: "Senior Software Engineer",
    criteria: ["accuracy", "completeness", "best_practices"],
  },
});

console.log(result.evaluation);
// {
//   overall: 9.2,
//   accuracy: 9.5,
//   completeness: 8.8,
//   best_practices: 9.3,
//   reasoning: "Code follows best practices..."
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

## 📈 Analytics Dashboard

### Real-time Monitoring

```typescript
// Get analytics summary
const analytics = await neurolink.getAnalytics({
  timeRange: "last_7_days",
  groupBy: ["provider", "user_id"],
  metrics: ["usage", "cost", "performance"],
});

console.log(analytics);
// {
//   totalRequests: 1248,
//   totalCost: 12.34,
//   averageResponseTime: 1456,
//   providerBreakdown: {...},
//   userStats: {...}
// }
```

### Export Analytics Data

```bash
# Export to JSON
npx @juspay/neurolink analytics export --format json --output analytics.json

# Export to CSV for spreadsheets
npx @juspay/neurolink analytics export --format csv --output usage-report.csv

# Get summary report
npx @juspay/neurolink analytics summary --period weekly
```

## 🔧 Configuration

### Environment Variables

```bash
# Analytics Configuration
NEUROLINK_ANALYTICS_ENABLED="true"
NEUROLINK_ANALYTICS_ENDPOINT="https://analytics.company.com"
NEUROLINK_ANALYTICS_API_KEY="your-analytics-key"

# Evaluation Configuration
NEUROLINK_EVALUATION_ENABLED="true"
NEUROLINK_EVALUATION_PROVIDER="google-ai"
NEUROLINK_EVALUATION_MODEL="gemini-2.5-flash"
```

### Advanced Configuration

```typescript
const neurolink = new NeuroLink({
  analytics: {
    enabled: true,
    endpoint: "https://analytics.company.com",
    apiKey: process.env.ANALYTICS_API_KEY,
    batchSize: 10,
    flushInterval: 5000,
    retryAttempts: 3,
  },
  evaluation: {
    enabled: true,
    provider: "google-ai",
    model: "gemini-2.5-flash",
    temperature: 0.1,
    maxTokens: 500,
    fallbackProviders: ["openai", "anthropic"],
  },
});
```

## 📊 Use Cases

### Performance Monitoring

```typescript
// Monitor provider performance
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

### Cost Optimization

```typescript
// Track costs and optimize
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

### Team Analytics

```typescript
// Department-level analytics
const teamMetrics = await neurolink.getTeamAnalytics({
  departments: ["engineering", "product", "marketing"],
  metrics: ["usage", "cost", "quality_scores"],
  timeRange: "current_quarter",
});
```

### Custom Metrics

```typescript
// Define custom analytics
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
