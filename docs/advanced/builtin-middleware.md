# Built-in Middleware Reference

NeuroLink includes three production-ready middleware components for common enterprise use cases: **Analytics**, **Guardrails**, and **Auto-Evaluation**. These middleware are battle-tested and ready to use in production applications.

## Quick Start

Enable all built-in middleware with a single preset:

```typescript
import { MiddlewareFactory } from "@juspay/neurolink";

const factory = new MiddlewareFactory({
  preset: "all", // Enables analytics + guardrails
});
```

Or enable specific middleware:

```typescript
const factory = new MiddlewareFactory({
  enabledMiddleware: ["analytics", "guardrails", "autoEvaluation"],
});
```

---

## Analytics Middleware

### Purpose

The **Analytics Middleware** collects comprehensive usage metrics, timing data, and operational analytics for all AI operations. It's essential for monitoring production applications, tracking costs, and understanding usage patterns.

**Key Capabilities:**

- Token usage tracking (input, output, total)
- Response time measurement
- Request success/failure tracking
- Provider and model information
- Automatic metrics storage in response metadata

### Configuration

**Basic Configuration:**

```typescript
import { MiddlewareFactory } from "@juspay/neurolink";

const factory = new MiddlewareFactory({
  preset: "default", // Analytics enabled by default
});
```

**Advanced Configuration:**

```typescript
const factory = new MiddlewareFactory({
  middlewareConfig: {
    analytics: {
      enabled: true,
      config: {
        // Custom configuration options can be added here
        // Currently analytics runs with default settings
      },
    },
  },
});
```

**Conditional Analytics (Production Only):**

```typescript
const factory = new MiddlewareFactory({
  middlewareConfig: {
    analytics: {
      enabled: true,
      conditions: {
        custom: (context) => process.env.NODE_ENV === "production",
      },
    },
  },
});
```

### Collected Metrics

| Metric         | Type   | Description                        | Unit         |
| -------------- | ------ | ---------------------------------- | ------------ |
| `requestId`    | string | Unique identifier for this request | -            |
| `timestamp`    | string | ISO 8601 timestamp                 | -            |
| `responseTime` | number | Total request duration             | milliseconds |
| `usage.input`  | number | Input tokens consumed              | tokens       |
| `usage.output` | number | Output tokens generated            | tokens       |
| `usage.total`  | number | Total tokens used                  | tokens       |

### Output Format

Analytics data is automatically added to the response metadata:

**Generate Response:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain quantum computing" },
  provider: "openai",
  model: "gpt-4",
});

// Access analytics from response metadata
const analytics = result.experimental_providerMetadata?.neurolink?.analytics;

console.log(analytics);
```

**Analytics Object Structure:**

```json
{
  "requestId": "analytics-1735689600000",
  "responseTime": 1523,
  "timestamp": "2026-01-01T00:00:00.000Z",
  "usage": {
    "input": 12,
    "output": 256,
    "total": 268
  }
}
```

**Stream Response:**

For streaming responses, analytics are available in the `rawResponse`:

```typescript
const result = await neurolink.stream({
  input: { text: "Write a story" },
});

// Analytics available in rawResponse
const streamAnalytics = result.rawResponse?.neurolink?.analytics;

console.log(streamAnalytics);
```

**Stream Analytics Structure:**

```json
{
  "requestId": "analytics-stream-1735689600000",
  "startTime": 1735689600000,
  "timestamp": "2026-01-01T00:00:00.000Z",
  "streamingMode": true
}
```

### Use Cases

**1. Cost Tracking:**

```typescript
const result = await neurolink.generate({ input: { text: "..." } });
const analytics = result.experimental_providerMetadata?.neurolink?.analytics;

// Calculate cost (example: $0.03 per 1K input tokens, $0.06 per 1K output tokens)
const inputCost = (analytics.usage.input / 1000) * 0.03;
const outputCost = (analytics.usage.output / 1000) * 0.06;
const totalCost = inputCost + outputCost;

console.log(`Request cost: $${totalCost.toFixed(4)}`);
```

**2. Performance Monitoring:**

```typescript
const analytics = result.experimental_providerMetadata?.neurolink?.analytics;

if (analytics.responseTime > 3000) {
  console.warn(`Slow request detected: ${analytics.responseTime}ms`);
  // Send alert to monitoring system
}
```

**3. Usage Analytics Dashboard:**

```typescript
// Aggregate analytics over multiple requests
const requests = [];

for (const prompt of prompts) {
  const result = await neurolink.generate({ input: { text: prompt } });
  const analytics = result.experimental_providerMetadata?.neurolink?.analytics;
  requests.push(analytics);
}

// Calculate aggregates
const totalTokens = requests.reduce((sum, a) => sum + a.usage.total, 0);
const avgResponseTime =
  requests.reduce((sum, a) => sum + a.responseTime, 0) / requests.length;

console.log(`Total tokens used: ${totalTokens}`);
console.log(`Average response time: ${avgResponseTime}ms`);
```

### Integration with External Systems

**Send to Datadog:**

```typescript
import { StatsD } from "node-dogstatsd";

const dogstatsd = new StatsD();

const result = await neurolink.generate({ input: { text: "..." } });
const analytics = result.experimental_providerMetadata?.neurolink?.analytics;

dogstatsd.histogram("neurolink.response_time", analytics.responseTime);
dogstatsd.increment("neurolink.tokens.total", analytics.usage.total);
dogstatsd.increment("neurolink.requests.success");
```

**Send to Prometheus:**

```typescript
import { register, Histogram, Counter } from "prom-client";

const responseTimeHistogram = new Histogram({
  name: "neurolink_response_time_ms",
  help: "Response time in milliseconds",
  buckets: [100, 500, 1000, 2000, 5000],
});

const tokenCounter = new Counter({
  name: "neurolink_tokens_total",
  help: "Total tokens consumed",
});

const result = await neurolink.generate({ input: { text: "..." } });
const analytics = result.experimental_providerMetadata?.neurolink?.analytics;

responseTimeHistogram.observe(analytics.responseTime);
tokenCounter.inc(analytics.usage.total);
```

---

## Guardrails Middleware

### Purpose

The **Guardrails Middleware** provides comprehensive content filtering and policy enforcement to block or redact unsafe content, prevent prompt injection attacks, and maintain compliance with content policies.

**Key Capabilities:**

- Bad word filtering (configurable word list)
- AI model-based content safety evaluation
- Precall evaluation (block unsafe prompts before they reach the LLM)
- Stream and generate support
- Configurable filtering actions (block, redact, log)

### Configuration

**Basic Configuration:**

```typescript
import { MiddlewareFactory } from "@juspay/neurolink";

const factory = new MiddlewareFactory({
  middlewareConfig: {
    guardrails: {
      enabled: true,
      config: {
        badWords: ["inappropriate", "unsafe", "prohibited"],
      },
    },
  },
});
```

**Advanced Configuration with Model-Based Filtering:**

```typescript
import { openai } from "@ai-sdk/openai";

const factory = new MiddlewareFactory({
  middlewareConfig: {
    guardrails: {
      enabled: true,
      config: {
        // Basic word filtering
        badWords: ["spam", "scam", "inappropriate"],

        // AI model-based filtering
        modelFilter: {
          enabled: true,
          filterModel: openai("gpt-3.5-turbo"), // Use a fast model for filtering
        },
      },
    },
  },
});
```

**Precall Evaluation (Block Unsafe Prompts):**

```typescript
const factory = new MiddlewareFactory({
  middlewareConfig: {
    guardrails: {
      enabled: true,
      config: {
        badWords: ["prohibited"],

        // Precall evaluation blocks unsafe prompts before they reach the LLM
        precallEvaluation: {
          enabled: true,
          provider: "openai",
          evaluationModel: "gpt-4", // Model name as string
          thresholds: {
            safetyScore: 7, // Safety threshold (1-10 scale, higher = more restrictive)
            appropriatenessScore: 6, // Appropriateness threshold (1-10 scale)
          },
          blockUnsafeRequests: true, // Block requests that fail evaluation
        },
      },
    },
  },
});
```

### Built-in Filters

| Filter Type            | Description                            | Action            | Configuration                     |
| ---------------------- | -------------------------------------- | ----------------- | --------------------------------- |
| **Bad Words**          | Block/redact specific words or phrases | Redact with `***` | `badWords: string[]`              |
| **Model-Based**        | Use AI to evaluate content safety      | Block if unsafe   | `modelFilter.enabled: true`       |
| **Precall Evaluation** | Block unsafe prompts before LLM call   | Block request     | `precallEvaluation.enabled: true` |

### Bad Word Filtering

**How It Works:**

The bad word filter scans both requests and responses for prohibited terms and replaces them with `***`.

**Example:**

```typescript
// Input prompt: "This is an inappropriate message"
// With badWords: ["inappropriate"]

// Output: "This is an *** message"
```

**Configuration:**

```typescript
config: {
  badWords: [
    "inappropriate",
    "prohibited",
    "unsafe",
    // Add your organization's blocked terms
  ];
}
```

### Model-Based Filtering

**How It Works:**

Uses a separate AI model to evaluate whether content is safe. The filter sends the content to the model with a safety evaluation prompt.

**Safety Evaluation Prompt:**

```
Is the following text safe? Respond with only "safe" or "unsafe".

Text: "[content to evaluate]"
```

**Example:**

```typescript
// If model responds "unsafe", content is redacted
// Output: "<REDACTED BY AI GUARDRAIL>"
```

**Configuration:**

```typescript
import { openai } from "@ai-sdk/openai";

config: {
  modelFilter: {
    enabled: true,
    filterModel: openai("gpt-3.5-turbo") // Fast, cost-effective model
  }
}
```

### Precall Evaluation

**How It Works:**

Evaluates the safety of the input prompt **before** it reaches the main LLM. If the prompt is deemed unsafe, the request is blocked entirely, saving costs and preventing unsafe content generation.

**Evaluation Process:**

1. User submits a prompt
2. Guardrails middleware intercepts in `transformParams`
3. Safety evaluation model scores the prompt (0-1 scale)
4. If score < threshold, request is blocked
5. If score >= threshold, request proceeds to main LLM

**Blocked Response:**

```json
{
  "text": "<BLOCKED BY PRECALL GUARDRAILS>",
  "usage": {
    "promptTokens": 0,
    "completionTokens": 0
  }
}
```

**Configuration:**

```typescript
config: {
  precallEvaluation: {
    enabled: true,
    provider: "openai",
    evaluationModel: "gpt-4", // Model for safety evaluation (string)
    thresholds: {
      safetyScore: 7, // Safety threshold (1-10 scale, default 7)
      appropriatenessScore: 6, // Appropriateness threshold (1-10 scale, default 6)
    },
    blockUnsafeRequests: true, // Block requests that fail evaluation
    actions: {
      onUnsafe: "block",
      onInappropriate: "sanitize",
      onSuspicious: "warn",
    },
  }
}
```

### Streaming Support

Guardrails work seamlessly with streaming responses:

```typescript
const result = await neurolink.stream({
  input: { text: "Generate a story" },
});

// Each chunk is filtered in real-time
for await (const chunk of result.stream) {
  console.log(chunk); // Filtered content
}
```

**Stream Filtering:**

- Bad words are replaced with `***` in each text delta
- Model-based filtering is not applied to streams (too slow)
- Precall evaluation works for streams

### Use Cases

**1. Content Moderation for User-Generated Prompts:**

```typescript
const factory = new MiddlewareFactory({
  middlewareConfig: {
    guardrails: {
      enabled: true,
      config: {
        badWords: ["spam", "abuse", "harassment"],
        precallEvaluation: {
          enabled: true,
          provider: "openai",
          evaluationModel: "gpt-4",
          thresholds: {
            safetyScore: 9, // Strict filtering (1-10 scale)
            appropriatenessScore: 8,
          },
          blockUnsafeRequests: true,
        },
      },
    },
  },
});
```

**2. Compliance with Content Policies:**

```typescript
const factory = new MiddlewareFactory({
  middlewareConfig: {
    guardrails: {
      enabled: true,
      config: {
        badWords: organizationBlocklist, // Your org's blocked terms
        modelFilter: {
          enabled: true,
          filterModel: openai("gpt-3.5-turbo"),
        },
      },
      conditions: {
        providers: ["openai", "anthropic"], // Only for external providers
      },
    },
  },
});
```

**3. Protecting Against Prompt Injection:**

```typescript
const factory = new MiddlewareFactory({
  middlewareConfig: {
    guardrails: {
      enabled: true,
      config: {
        precallEvaluation: {
          enabled: true,
          provider: "openai",
          evaluationModel: "gpt-4",
          thresholds: {
            safetyScore: 8, // High safety threshold (1-10 scale)
            appropriatenessScore: 7,
          },
          blockUnsafeRequests: true,
          actions: {
            onUnsafe: "block",
            onInappropriate: "block",
            onSuspicious: "block",
          },
        },
      },
    },
  },
});
```

---

## Auto-Evaluation Middleware

### Purpose

The **Auto-Evaluation Middleware** automatically evaluates AI response quality using configurable criteria. It can trigger retries for low-quality responses and provide quality metrics for monitoring.

**Key Capabilities:**

- Automatic quality evaluation after each response
- Configurable evaluation criteria (relevance, accuracy, coherence, etc.)
- Blocking and non-blocking modes
- Integration with custom evaluation providers
- Quality score thresholds

### Configuration

**Basic Configuration:**

```typescript
import { MiddlewareFactory } from "@juspay/neurolink";

const factory = new MiddlewareFactory({
  middlewareConfig: {
    autoEvaluation: {
      enabled: true,
      config: {
        threshold: 7, // Minimum quality score (0-10)
        blocking: true, // Wait for evaluation before returning
      },
    },
  },
});
```

**Advanced Configuration:**

```typescript
const factory = new MiddlewareFactory({
  middlewareConfig: {
    autoEvaluation: {
      enabled: true,
      config: {
        threshold: 8,
        blocking: false, // Non-blocking: evaluation happens in background

        // Custom evaluation provider
        provider: "openai",
        evaluationModel: "gpt-4",

        // Custom prompt generator for evaluation
        promptGenerator: (options, result) => {
          return `Evaluate the following AI response on a scale of 0-10 for:
- Relevance to the prompt
- Factual accuracy
- Coherence and clarity
- Helpfulness

Prompt: ${options.prompt}
Response: ${result.content}

Score (0-10):`;
        },

        // Callback when evaluation completes
        onEvaluationComplete: async (evaluationResult) => {
          console.log("Evaluation complete:", evaluationResult);

          if (evaluationResult.score < 7) {
            // Send alert for low-quality response
            await sendAlert({
              type: "low_quality_response",
              score: evaluationResult.score,
            });
          }
        },
      },
    },
  },
});
```

### Evaluation Criteria

Default evaluation criteria (can be customized):

| Criterion       | Description                        | Score Range |
| --------------- | ---------------------------------- | ----------- |
| **Relevance**   | Response relevance to the prompt   | 0-10        |
| **Accuracy**    | Factual accuracy and correctness   | 0-10        |
| **Coherence**   | Logical structure and clarity      | 0-10        |
| **Helpfulness** | Value provided to the user         | 0-10        |
| **Safety**      | Content safety and appropriateness | 0-10        |

### Blocking vs Non-Blocking Mode

**Blocking Mode (`blocking: true`):**

- Evaluation happens before response is returned
- User waits for evaluation to complete
- Can retry or reject responses based on quality
- Use for critical applications where quality is paramount

```typescript
config: {
  blocking: true,
  threshold: 8
}

// Request waits until evaluation completes
const result = await neurolink.generate({ input: { text: "..." } });

// Evaluation result is available
console.log(result.evaluationResult);
```

**Non-Blocking Mode (`blocking: false`, default):**

- Evaluation happens in background
- Response returned immediately
- Quality metrics available via callback
- Use for most applications to maintain low latency

```typescript
config: {
  blocking: false,
  threshold: 7,
  onEvaluationComplete: async (evaluationResult) => {
    // Handle evaluation asynchronously
    await logEvaluation(evaluationResult);
  }
}

// Response returned immediately
const result = await neurolink.generate({ input: { text: "..." } });
// Evaluation runs in background
```

### Evaluation Output

**Evaluation Result Structure:**

```typescript
type EvaluationResult = {
  // Overall quality score (0-10)
  score: number;

  // Detailed scores per criterion
  criteria: {
    relevance: number;
    accuracy: number;
    coherence: number;
    helpfulness: number;
    safety: number;
  };

  // Whether the response passed the threshold
  passed: boolean;

  // Optional feedback from evaluator
  feedback?: string;

  // Timestamp of evaluation
  timestamp: string;
};
```

**Example Output:**

```json
{
  "score": 8.5,
  "criteria": {
    "relevance": 9,
    "accuracy": 8,
    "coherence": 9,
    "helpfulness": 8,
    "safety": 10
  },
  "passed": true,
  "feedback": "High-quality response with accurate information and clear structure.",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

### Streaming Support

**Important:** Auto-evaluation for streaming responses always runs in **non-blocking mode**, even if `blocking: true` is configured. This is because the stream needs to be returned to the user immediately.

```typescript
config: {
  blocking: true; // Ignored for streams
}

const result = await neurolink.stream({ input: { text: "..." } });

// Stream returns immediately
for await (const chunk of result.stream) {
  console.log(chunk);
}

// Evaluation happens in background after stream completes
```

### Use Cases

**1. Quality Assurance for Customer-Facing AI:**

```typescript
const factory = new MiddlewareFactory({
  middlewareConfig: {
    autoEvaluation: {
      enabled: true,
      config: {
        threshold: 8, // High quality requirement
        blocking: true, // Wait for evaluation
        onEvaluationComplete: async (evaluation) => {
          if (!evaluation.passed) {
            // Log low-quality response for review
            await logQualityIssue({
              score: evaluation.score,
              feedback: evaluation.feedback,
            });
          }
        },
      },
    },
  },
});
```

**2. Automatic Response Improvement:**

```typescript
const factory = new MiddlewareFactory({
  middlewareConfig: {
    autoEvaluation: {
      enabled: true,
      config: {
        threshold: 7,
        blocking: true,
        onEvaluationComplete: async (evaluation) => {
          if (!evaluation.passed) {
            // Trigger retry with modified prompt
            console.log("Quality below threshold, retrying...");
            // Implementation would retry the request
          }
        },
      },
    },
  },
});
```

**3. Quality Metrics Dashboard:**

```typescript
const evaluationResults = [];

const factory = new MiddlewareFactory({
  middlewareConfig: {
    autoEvaluation: {
      enabled: true,
      config: {
        threshold: 7,
        blocking: false, // Background evaluation
        onEvaluationComplete: async (evaluation) => {
          evaluationResults.push(evaluation);

          // Calculate rolling average quality
          const avgScore =
            evaluationResults.slice(-100).reduce((sum, e) => sum + e.score, 0) /
            100;

          console.log(`Average quality (last 100): ${avgScore}`);
        },
      },
    },
  },
});
```

### Environment Variables

Configure auto-evaluation via environment variables:

```bash
# Set default threshold
NEUROLINK_EVALUATION_THRESHOLD=7

# Use in configuration
```

```typescript
const factory = new MiddlewareFactory({
  middlewareConfig: {
    autoEvaluation: {
      enabled: true,
      config: {
        threshold: Number(process.env.NEUROLINK_EVALUATION_THRESHOLD) || 7,
      },
    },
  },
});
```

---

## Combining Middleware

### Recommended Execution Order

Middleware executes in **priority order** (higher priority runs first). Here's the recommended order for combining built-in middleware:

```
Priority 100: Analytics (always run first)
Priority 90:  Guardrails (security checks)
Priority 90:  Auto-Evaluation (quality checks)
```

**Why This Order?**

1. **Analytics first**: Capture metrics for all requests, even blocked ones
2. **Guardrails second**: Block unsafe content before it's evaluated
3. **Auto-Evaluation last**: Evaluate quality of safe responses

### Example: Production Configuration

```typescript
import { MiddlewareFactory } from "@juspay/neurolink";
import { openai } from "@ai-sdk/openai";

const factory = new MiddlewareFactory({
  preset: "all", // Enables analytics + guardrails

  // Customize individual middleware
  middlewareConfig: {
    analytics: {
      enabled: true,
      // Always enabled for production monitoring
    },

    guardrails: {
      enabled: true,
      config: {
        badWords: ["spam", "abuse", "harassment"],
        precallEvaluation: {
          enabled: true,
          provider: "openai",
          evaluationModel: "gpt-4",
          thresholds: {
            safetyScore: 8, // High safety threshold (1-10 scale)
            appropriatenessScore: 7,
          },
          blockUnsafeRequests: true,
        },
      },
    },

    autoEvaluation: {
      enabled: true,
      config: {
        threshold: 7,
        blocking: false, // Non-blocking for performance
        onEvaluationComplete: async (evaluation) => {
          // Log to monitoring system
          await sendMetric("ai.quality.score", evaluation.score);
        },
      },
    },
  },
});
```

### Example: Development Configuration

```typescript
const factory = new MiddlewareFactory({
  middlewareConfig: {
    analytics: {
      enabled: true,
      // Track usage in development
    },

    guardrails: {
      enabled: false,
      // Disable in development for easier testing
    },

    autoEvaluation: {
      enabled: false,
      // Disable in development for faster iteration
    },
  },
});
```

### Example: Security-First Configuration

```typescript
const factory = new MiddlewareFactory({
  preset: "security", // Guardrails only

  middlewareConfig: {
    guardrails: {
      enabled: true,
      config: {
        badWords: organizationBlocklist,
        precallEvaluation: {
          enabled: true,
          provider: "openai",
          evaluationModel: "gpt-4",
          thresholds: {
            safetyScore: 9, // Very strict (1-10 scale)
            appropriatenessScore: 9,
          },
          blockUnsafeRequests: true,
        },
      },
    },

    analytics: {
      enabled: true,
      // Track security metrics
    },
  },
});
```

---

## Performance Considerations

### Analytics

- **Overhead**: Minimal (<5ms per request)
- **Impact**: None on latency (runs in request/response flow)
- **Recommendation**: Always enable in production

### Guardrails

- **Bad Word Filtering**: Very fast (<1ms)
- **Model-Based Filtering**: Adds 200-500ms (extra AI call)
- **Precall Evaluation**: Adds 200-500ms (evaluated before main call)
- **Recommendation**: Use bad word filtering always, model-based filtering selectively

### Auto-Evaluation

- **Blocking Mode**: Adds 200-1000ms to response time
- **Non-Blocking Mode**: No impact on response time
- **Recommendation**: Use non-blocking mode for most applications

### Optimization Tips

1. **Use Conditional Execution**: Only apply expensive middleware when needed

   ```typescript
   conditions: {
     custom: (context) => context.options.requireEvaluation === true;
   }
   ```

2. **Use Fast Models for Filtering**: Use GPT-3.5 instead of GPT-4 for guardrails

   ```typescript
   filterModel: openai("gpt-3.5-turbo"); // Fast and cost-effective
   ```

3. **Batch Evaluations**: For non-blocking auto-evaluation, batch multiple evaluations

   ```typescript
   onEvaluationComplete: async (evaluation) => {
     evaluationQueue.push(evaluation);
     if (evaluationQueue.length >= 10) {
       await sendBatchToMonitoring(evaluationQueue);
       evaluationQueue = [];
     }
   };
   ```

---

## Troubleshooting

### Analytics Not Appearing in Response

**Problem**: Analytics data is missing from response metadata.

**Solution**:

1. Verify analytics is enabled:

   ```typescript
   factory.registry.has("analytics"); // Should return true
   ```

2. Check preset configuration:

   ```typescript
   const factory = new MiddlewareFactory({
     preset: "default", // Analytics enabled by default
   });
   ```

3. Access analytics correctly:

   ```typescript
   const analytics = result.experimental_providerMetadata?.neurolink?.analytics;
   ```

### Guardrails Blocking Valid Content

**Problem**: Guardrails are blocking safe content.

**Solution**:

1. Adjust precall evaluation threshold:

   ```typescript
   threshold: 0.7; // Lower threshold for less strict filtering
   ```

2. Review bad words list:

   ```typescript
   badWords: []; // Temporarily disable to test
   ```

3. Check model-based filter:

   ```typescript
   modelFilter: {
     enabled: false; // Temporarily disable to test
   }
   ```

### Auto-Evaluation Slowing Down Responses

**Problem**: Responses are slower due to evaluation.

**Solution**:

1. Use non-blocking mode:

   ```typescript
   blocking: false;
   ```

2. Reduce evaluation frequency:

   ```typescript
   conditions: {
     custom: (context) => Math.random() < 0.1; // Evaluate 10% of requests
   }
   ```

3. Use faster evaluation model:

   ```typescript
   evaluationModel: "gpt-3.5-turbo",
   ```

---

## See Also

- [Middleware Architecture](middleware-architecture.md) - Deep dive into middleware system design
- [Custom Middleware Guide](../custom-middleware-guide.md) - Create your own middleware
- [HITL Integration](../features/enterprise-hitl.md) - Combine middleware with human approval workflows
- [Provider Comparison](../reference/provider-comparison.md) - Which providers work best with middleware
