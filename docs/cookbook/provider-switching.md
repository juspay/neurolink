# Provider Switching

## Problem

Different AI providers have different strengths, costs, and availability. You may need to:

- Compare outputs across providers for quality evaluation
- Switch providers at runtime based on user preference or task type
- Implement graceful fallback when a provider is down
- Optimize cost by routing different workloads to different providers

## Solution

NeuroLink's unified API makes provider switching a one-line change. The `provider` and `model` fields on `generate()` and `stream()` accept any registered provider name. This recipe shows how to leverage that for comparison, runtime switching, and basic fallback.

## Code

```typescript
import { NeuroLink } from "@juspay/neurolink";

// -----------------------------------------------------------
// 1. Compare the same prompt across multiple providers
// -----------------------------------------------------------
async function compareProviders(prompt: string) {
  const neurolink = new NeuroLink();

  const providers = [
    { provider: "openai", model: "gpt-4o" },
    { provider: "anthropic", model: "claude-sonnet-4-20250514" },
    { provider: "google-ai", model: "gemini-2.5-flash" },
  ] as const;

  const results = await Promise.allSettled(
    providers.map(async (config) => {
      const start = Date.now();

      const result = await neurolink.generate({
        input: { text: prompt },
        provider: config.provider,
        model: config.model,
        temperature: 0.3,
      });

      return {
        provider: config.provider,
        model: config.model,
        content: result.content,
        responseTime: Date.now() - start,
        tokens: result.usage?.total,
      };
    }),
  );

  // Print comparison
  for (const entry of results) {
    if (entry.status === "fulfilled") {
      const r = entry.value;
      console.log(`\n--- ${r.provider} (${r.model}) ---`);
      console.log(`Response time: ${r.responseTime}ms`);
      console.log(`Tokens used: ${r.tokens ?? "N/A"}`);
      console.log(`Response:\n${r.content.slice(0, 200)}...`);
    } else {
      console.log(`\nFailed: ${entry.reason}`);
    }
  }
}

// -----------------------------------------------------------
// 2. Runtime provider selection
// -----------------------------------------------------------
async function generateWithProvider(
  prompt: string,
  providerName: string,
  modelName?: string,
) {
  const neurolink = new NeuroLink();

  const result = await neurolink.generate({
    input: { text: prompt },
    provider: providerName,
    model: modelName,
  });

  console.log(`[${result.provider}/${result.model}] ${result.content}`);
  return result;
}

// -----------------------------------------------------------
// 3. Simple fallback chain
// -----------------------------------------------------------
async function generateWithFallback(prompt: string) {
  const neurolink = new NeuroLink();

  const fallbackChain = [
    { provider: "openai", model: "gpt-4o" },
    { provider: "anthropic", model: "claude-sonnet-4-20250514" },
    { provider: "google-ai", model: "gemini-2.5-flash" },
  ];

  for (const config of fallbackChain) {
    try {
      const result = await neurolink.generate({
        input: { text: prompt },
        provider: config.provider,
        model: config.model,
        timeout: 15000,
      });

      console.log(`Success with ${config.provider}`);
      return result;
    } catch (error: any) {
      console.warn(
        `${config.provider} failed: ${error.message}. Trying next...`,
      );
    }
  }

  throw new Error("All providers failed");
}

// -----------------------------------------------------------
// Usage
// -----------------------------------------------------------
async function main() {
  // Compare providers on the same prompt
  await compareProviders("What are the three laws of thermodynamics?");

  // Switch provider at runtime (e.g., from user config or CLI flag)
  const userPreference = process.env.AI_PROVIDER || "openai";
  await generateWithProvider(
    "Summarize quantum computing in one paragraph.",
    userPreference,
  );

  // Fallback chain
  const result = await generateWithFallback("Explain the CAP theorem.");
  console.log(result.content);
}

main();
```

## Explanation

### 1. Unified API Across Providers

NeuroLink abstracts away provider-specific APIs. The same `input` object works with every provider:

```typescript
// These three calls have identical structure -- only provider/model differ
await neurolink.generate({
  input: { text: prompt },
  provider: "openai",
  model: "gpt-4o",
});
await neurolink.generate({
  input: { text: prompt },
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
});
await neurolink.generate({
  input: { text: prompt },
  provider: "google-ai",
  model: "gemini-2.5-flash",
});
```

### 2. Provider Names and Aliases

NeuroLink supports both canonical names and aliases:

| Canonical Name | Aliases                              |
| -------------- | ------------------------------------ |
| `openai`       | `gpt`, `chatgpt`                     |
| `anthropic`    | `claude`                             |
| `google-ai`    | `googleAiStudio`, `google`, `gemini` |
| `vertex`       | `googleVertex`, `google-vertex`      |
| `bedrock`      | `amazonBedrock`, `aws-bedrock`       |
| `azure`        | `azureOpenai`, `azure-openai`        |
| `mistral`      | `mistralai`                          |
| `litellm`      | `lite-llm`, `lite`                   |
| `ollama`       | (none)                               |

### 3. Parallel Comparison with `Promise.allSettled`

Use `Promise.allSettled` (not `Promise.all`) so that one provider's failure does not cancel the others:

```typescript
const results = await Promise.allSettled(
  providers.map((config) => neurolink.generate({ ... })),
);
```

Each result is either `{ status: "fulfilled", value: ... }` or `{ status: "rejected", reason: ... }`.

### 4. Timeout for Fallback

Set a `timeout` to prevent a slow provider from blocking the fallback chain:

```typescript
await neurolink.generate({
  input: { text: prompt },
  provider: "openai",
  timeout: 15000, // 15 seconds
});
```

## Variations

### Task-Based Routing

Route different tasks to the best provider for each:

```typescript
type TaskType = "code" | "creative" | "analysis" | "simple";

const TASK_ROUTING: Record<TaskType, { provider: string; model: string }> = {
  code: { provider: "anthropic", model: "claude-sonnet-4-20250514" },
  creative: { provider: "openai", model: "gpt-4o" },
  analysis: { provider: "google-ai", model: "gemini-2.5-pro" },
  simple: { provider: "google-ai", model: "gemini-2.5-flash" },
};

async function routeByTask(task: TaskType, prompt: string) {
  const neurolink = new NeuroLink();
  const config = TASK_ROUTING[task];

  return neurolink.generate({
    input: { text: prompt },
    provider: config.provider,
    model: config.model,
  });
}
```

### Stream with Provider Switching

The same pattern works for streaming:

```typescript
async function streamFromProvider(prompt: string, provider: string) {
  const neurolink = new NeuroLink();

  const result = await neurolink.stream({
    input: { text: prompt },
    provider,
  });

  for await (const chunk of result.stream) {
    if ("content" in chunk && chunk.content) {
      process.stdout.write(chunk.content);
    }
  }

  console.log("\n");
}
```

### A/B Testing Providers

Run a percentage of traffic through different providers:

```typescript
function selectProvider(): { provider: string; model: string } {
  const random = Math.random();

  if (random < 0.7) {
    return { provider: "openai", model: "gpt-4o" }; // 70% of traffic
  } else if (random < 0.9) {
    return { provider: "anthropic", model: "claude-sonnet-4-20250514" }; // 20%
  } else {
    return { provider: "google-ai", model: "gemini-2.5-flash" }; // 10%
  }
}

async function generateABTest(prompt: string) {
  const neurolink = new NeuroLink();
  const config = selectProvider();

  const start = Date.now();
  const result = await neurolink.generate({
    input: { text: prompt },
    provider: config.provider,
    model: config.model,
  });

  // Log for analysis
  console.log(
    JSON.stringify({
      provider: config.provider,
      model: config.model,
      responseTime: Date.now() - start,
      tokens: result.usage?.total,
    }),
  );

  return result;
}
```

## Tips

1. **Default models**: If you omit the `model` field, each provider uses its default model. This is fine for quick testing but specify the model explicitly in production.
2. **Environment variables**: Each provider reads its API key from standard environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`, etc.). Configure only the providers you need.
3. **Cost awareness**: Provider pricing varies significantly. Use cheaper models (e.g., `gemini-2.5-flash`, `gpt-4o-mini`) for simple tasks and reserve expensive models for complex reasoning.
4. **Consistency**: Different providers may produce different response styles. If you need consistent formatting, use a `systemPrompt` to enforce structure.

## See Also

- [Multi-Provider Fallback](multi-provider-fallback.md)
- [Cost Optimization](cost-optimization.md)
- [Error Recovery Patterns](error-recovery.md)
- [Streaming with Retry Logic](streaming-with-retry.md)
