---
title: Auto Evaluation Engine
description: Automated quality scoring and metrics export for AI response validation using LLM-as-judge
keywords: auto evaluation, quality scoring, llm as judge, ragas, metrics, quality gate
---

# Auto Evaluation Engine

NeuroLink 7.46.0 adds an automated quality gate that scores every response using an LLM-as-judge pipeline. Scores, rationales, and severity flags are surfaced in both CLI and SDK workflows so you can monitor drift and enforce minimum quality thresholds.

## What It Does

- Generates a structured evaluation payload (`result.evaluation`) for every call with `enableEvaluation: true`.
- Calculates relevance, accuracy, completeness, and an overall score (1–10) using a RAGAS-style rubric.
- Supports retry loops: re-ask the provider when the score falls below your threshold.
- Emits analytics-friendly JSON so you can pipe results into dashboards.

!!! warning "LLM Costs"
Evaluation uses additional AI calls to the judge model (default: `gemini-2.5-flash`). Each evaluated response incurs extra API costs. For high-volume production workloads, consider sampling (e.g., evaluate 10% of requests) or disabling evaluation after quality stabilizes.

## Usage Examples

=== "SDK"

    ```typescript
    import { NeuroLink } from "@juspay/neurolink";

    const neurolink = new NeuroLink({ enableOrchestration: true });  // (1)!

    const result = await neurolink.generate({
      input: { text: "Create quarterly performance summary" },  // (2)!
      enableEvaluation: true,  // (3)!
      evaluationDomain: "Enterprise Finance",  // (4)!
      factoryConfig: {
        enhancementType: "domain-configuration",  // (5)!
        domainType: "finance",
      },
    });

    if (result.evaluation && !result.evaluation.isPassing) {  // (6)!
      console.warn("Quality gate failed", result.evaluation.details?.message);
    }
    ```

    1. Enable orchestration for automatic provider/model selection
    2. Task classifier analyzes prompt to determine best provider
    3. Enable LLM-as-judge quality scoring
    4. Provide domain context to shape evaluation rubric
    5. Apply domain-specific prompt enhancements
    6. Check if response passes the configured quality threshold

=== "CLI"

    ```bash
    # Baseline quality check
    npx @juspay/neurolink generate "Draft onboarding email" --enableEvaluation

    # Combine with analytics for observability dashboards
    npx @juspay/neurolink generate "Summarise release notes" \
      --enableEvaluation --enableAnalytics --format json

    # Domain-aware evaluations shape the rubric
    npx @juspay/neurolink generate "Refactor this API" \
      --enableEvaluation --evaluationDomain "Principal Engineer"

    # Fail the command if the score dips below 7 (set env variable first)
    NEUROLINK_EVALUATION_THRESHOLD=7 npx @juspay/neurolink generate "Write compliance summary" \
      --enableEvaluation
    ```

    **CLI output (text mode):**

    ```
    📊 Evaluation Summary
    • Overall: 8.6/10 (Passing threshold: 7)
    • Relevance: 9.0  • Accuracy: 8.5  • Completeness: 8.0
    • Reasoning: Response covers all requested sections with correct policy references.
    ```

## Streaming with Evaluation

```typescript
const stream = await neurolink.stream({
  input: { text: "Walk through the incident postmortem" },
  enableEvaluation: true, // (1)!
});

let final;
for await (const chunk of stream) {
  if (chunk.evaluation) {
    // (2)!
    final = chunk.evaluation; // (3)!
  }
}
console.log(final?.overallScore); // (4)!
```

1. Evaluation works in streaming mode
2. Evaluation payload arrives in final chunks
3. Capture the evaluation object
4. Access overall score (1-10) and sub-scores

## Configuration Options

| Option                                | Where                            | Description                                                        |
| ------------------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| `enableEvaluation`                    | CLI flag / request option        | Turns the middleware on for this call.                             |
| `evaluationDomain`                    | CLI flag / request option        | Provides context to the judge model (e.g., `"Healthcare"`).        |
| `NEUROLINK_EVALUATION_THRESHOLD`      | Env variable / loop session var  | Minimum passing score; failures trigger retries or errors.         |
| `NEUROLINK_EVALUATION_MODEL`          | Env variable / middleware config | Override the default judge model (defaults to `gemini-2.5-flash`). |
| `NEUROLINK_EVALUATION_PROVIDER`       | Env variable                     | Force the judge provider (`google-ai` by default).                 |
| `NEUROLINK_EVALUATION_RETRY_ATTEMPTS` | Env variable                     | Number of re-evaluation attempts before surfacing failure.         |
| `NEUROLINK_EVALUATION_TIMEOUT`        | Env variable                     | Millisecond timeout for judge requests.                            |
| `offTopicThreshold`                   | Middleware config                | Score below which a response is flagged as off-topic.              |
| `highSeverityThreshold`               | Middleware config                | Score threshold for triggering high-severity alerts.               |

Set global defaults by exporting environment variables in your `.env`:

```bash
NEUROLINK_EVALUATION_PROVIDER="google-ai"
NEUROLINK_EVALUATION_MODEL="gemini-2.5-flash"
NEUROLINK_EVALUATION_THRESHOLD=7
NEUROLINK_EVALUATION_RETRY_ATTEMPTS=2
NEUROLINK_EVALUATION_TIMEOUT=15000
```

> Loop sessions respect these values. Inside `neurolink loop`, use `set NEUROLINK_EVALUATION_THRESHOLD 8` or `unset NEUROLINK_EVALUATION_THRESHOLD` to adjust the gate on the fly.

## Best Practices

!!! tip "Cost Optimization"
Only enable evaluation when needed: during prompt engineering, quality regression testing, or high-stakes production calls. For routine operations, disable evaluation and rely on [Analytics](../advanced/analytics.md) for zero-cost observability.

- Pair evaluation with analytics to track cost vs. quality trends.
- Lower the threshold during experimentation, then tighten once prompts stabilise.
- Register a custom `onEvaluationComplete` handler to forward scores to BI systems.
- Exclude massive prompts from evaluation when latency matters; analytics is zero-cost without evaluation.

## Troubleshooting

| Issue                                | Fix                                                                                                              |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `Evaluation model not configured`    | Ensure judge provider API keys are present or set `NEUROLINK_EVALUATION_PROVIDER`.                               |
| CLI exits with failure               | Lower `NEUROLINK_EVALUATION_THRESHOLD` or configure the middleware with `blocking: false`.                       |
| Evaluation takes too long            | Reduce `NEUROLINK_EVALUATION_RETRY_ATTEMPTS` or switch to a smaller judge model (e.g., `gemini-2.5-flash-lite`). |
| Off-topic false positives            | Increase `offTopicThreshold` to a lower score (e.g., 3).                                                         |
| JSON output missing evaluation block | Confirm `--format json` and `--enableEvaluation` are both set.                                                   |

## Related Features

**Q4 2025 Features:**

- [Guardrails Middleware](guardrails.md) – Combine evaluation with content filtering for comprehensive quality control

**Q3 2025 Features:**

- [Multimodal Chat](multimodal-chat.md) – Evaluate vision-based responses
- [CLI Loop Sessions](cli-loop-sessions.md) – Set evaluation threshold in loop mode

**Documentation:**

- [Analytics Guide](../advanced/analytics.md) – Track evaluation metrics over time
- [SDK API Reference](../sdk/api-reference.md) – Evaluation options
- [Troubleshooting](../TROUBLESHOOTING.md) – Common evaluation issues
