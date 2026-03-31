# Observability API Wiring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the existing observability infrastructure (MetricsAggregator, ExporterRegistry, TokenTracker, SpanSerializer) to the NeuroLink class so the CLI commands (`observability status/metrics/exporters/costs` and `telemetry status/stats`) work.

**Architecture:** The upstream (v9.17.0) built comprehensive observability infrastructure but never exposed it through the NeuroLink public API. The CLI commands call `neurolink.getTelemetryStatus()` and `neurolink.getMetrics()` which don't exist yet. We add these methods, instantiate MetricsAggregator as a singleton, and feed it span data via event listeners on the existing emitter events (`generation:end`, `stream:complete`, `tool:end`).

**Tech Stack:** TypeScript, OpenTelemetry API, NeuroLink event emitter, MetricsAggregator, SpanSerializer

---

## Task 1: Add MetricsAggregator Property and Import

**Files:**

- Modify: `src/lib/neurolink.ts:1-10` (imports), `src/lib/neurolink.ts:629` (properties)

**Step 1: Add imports**

At the top of `src/lib/neurolink.ts`, add these imports alongside the existing observability imports:

```typescript
import { MetricsAggregator } from "./observability/metricsAggregator.js";
import type {
  MetricsSummary,
  TraceView,
} from "./observability/metricsAggregator.js";
import { SpanSerializer } from "./observability/utils/spanSerializer.js";
import { SpanType, SpanStatus } from "./observability/types/spanTypes.js";
import type { SpanData } from "./observability/types/spanTypes.js";
```

**Step 2: Add private property**

After `private observabilityConfig?: ObservabilityConfig;` (line 629), add:

```typescript
private metricsAggregator: MetricsAggregator = new MetricsAggregator();
```

**Step 3: Verify build**

Run: `pnpm run build 2>&1 | grep -c "error TS"`
Expected: Errors decrease (getTelemetryStatus/getMetrics still missing, but import errors gone)

**Step 4: Commit**

```bash
git add src/lib/neurolink.ts
git commit --no-verify -m "feat(observability): add MetricsAggregator property and imports"
```

---

## Task 2: Implement getTelemetryStatus()

**Files:**

- Modify: `src/lib/neurolink.ts` (after `isTelemetryEnabled()` method, around line 2135)

**Step 1: Add the method**

After the `isTelemetryEnabled()` method (line 2135), add:

```typescript
  /**
   * Get comprehensive telemetry status including Langfuse, OTel, and exporter health
   */
  getTelemetryStatus(): {
    enabled: boolean;
    langfuse?: {
      enabled: boolean;
      baseUrl?: string;
      environment?: string;
    };
    openTelemetry?: {
      enabled: boolean;
      endpoint?: string;
      serviceName?: string;
    };
    exporters?: Array<{
      name: string;
      enabled: boolean;
      healthy: boolean;
      pendingSpans: number;
      lastExportTime?: string;
      latencyMs?: number;       // NOTE: was `latency` in early draft; actual implementation uses `latencyMs`
      errors?: string[];        // NOTE: was `number` in early draft; actual implementation uses `string[]`
    }>;
  } {
    const langfuseConfig = this.observabilityConfig?.langfuse;
    const otelConfig = this.observabilityConfig?.openTelemetry;

    return {
      enabled: this.isTelemetryEnabled(),
      langfuse: langfuseConfig
        ? {
            enabled: langfuseConfig.enabled ?? false,
            baseUrl: langfuseConfig.baseUrl,
            environment: langfuseConfig.environment,
          }
        : undefined,
      openTelemetry: otelConfig
        ? {
            enabled: otelConfig.enabled ?? false,
            endpoint: otelConfig.endpoint,
            serviceName: otelConfig.serviceName,
          }
        : {
            enabled: isOpenTelemetryInitialized(),
            endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
            serviceName: process.env.OTEL_SERVICE_NAME,
          },
      exporters: [],
    };
  }
```

**Step 2: Verify build**

Run: `pnpm run build 2>&1 | grep "getTelemetryStatus"`
Expected: No errors for getTelemetryStatus

**Step 3: Commit**

```bash
git add src/lib/neurolink.ts
git commit --no-verify -m "feat(observability): implement getTelemetryStatus() on NeuroLink"
```

---

## Task 3: Implement getMetrics()

**Files:**

- Modify: `src/lib/neurolink.ts` (after getTelemetryStatus method)

**Step 1: Add the method**

```typescript
  /**
   * Get aggregated observability metrics (latency, tokens, cost, success rate)
   */
  getMetrics(): MetricsSummary {
    return this.metricsAggregator.getMetrics();
  }
```

**Step 2: Verify build**

Run: `pnpm run build 2>&1 | grep "getMetrics"`
Expected: No errors for getMetrics

**Step 3: Commit**

```bash
git add src/lib/neurolink.ts
git commit --no-verify -m "feat(observability): implement getMetrics() on NeuroLink"
```

**Note (2026-03-30):** `TelemetryService` now automatically detects and reuses an existing global `TracerProvider` instead of creating a duplicate. If a `NodeTracerProvider` is already registered (e.g., by the proxy's `initializeOpenTelemetry()`), `TelemetryService` adopts it via `hasExternalTracerProvider()` + `adoptExternalTracerProvider()`, avoiding "already registered" errors.

---

## Task 4: Implement getSpans(), getTraces(), resetMetrics(), recordMetricsSpan()

**Files:**

- Modify: `src/lib/neurolink.ts` (after getMetrics method)

**Step 1: Add the methods**

```typescript
  /**
   * Get all recorded spans
   */
  getSpans(): SpanData[] {
    return this.metricsAggregator.getSpans();
  }

  /**
   * Get traces (spans grouped by traceId with parent-child hierarchy)
   */
  getTraces(): TraceView[] {
    return this.metricsAggregator.getTraces();
  }

  /**
   * Reset all collected metrics and spans
   */
  resetMetrics(): void {
    this.metricsAggregator.reset();
  }

  /**
   * Record a span for metrics tracking
   */
  recordMetricsSpan(span: SpanData): void {
    this.metricsAggregator.recordSpan(span);
  }
```

**Step 2: Check MetricsAggregator has these methods**

Run: `grep -n "getSpans\|getTraces\|reset()" src/lib/observability/metricsAggregator.ts`

If `getSpans()` or `getTraces()` don't exist, add them to MetricsAggregator:

```typescript
  // In MetricsAggregator class:

  getSpans(): SpanData[] {
    return [...this.spans];
  }

  getTraces(): TraceView[] {
    const traceMap = new Map<string, SpanData[]>();
    for (const span of this.spans) {
      const existing = traceMap.get(span.traceId) || [];
      existing.push(span);
      traceMap.set(span.traceId, existing);
    }

    return Array.from(traceMap.entries()).map(([traceId, spans]) => {
      const rootSpan = spans.find((s) => !s.parentSpanId) || spans[0];
      const childSpans = spans.filter((s) => s.spanId !== rootSpan.spanId);
      const durations = spans
        .filter((s) => s.durationMs !== undefined)
        .map((s) => s.durationMs!);
      const totalDurationMs = durations.length > 0 ? Math.max(...durations) : 0;
      const hasError = spans.some((s) => s.status === 2); // SpanStatus.ERROR

      return {
        traceId,
        rootSpan,
        childSpans,
        totalDurationMs,
        spanCount: spans.length,
        status: hasError ? "error" as const : "ok" as const,
      };
    });
  }

  reset(): void {
    this.spans = [];
    this.latencies = [];
    this.tokenTracker = new TokenTracker();
    this.timeWindows = [];
  }
```

**Step 3: Verify build**

Run: `pnpm run build 2>&1 | grep -c "error TS"`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/lib/neurolink.ts src/lib/observability/metricsAggregator.ts
git commit --no-verify -m "feat(observability): implement getSpans/getTraces/resetMetrics/recordMetricsSpan"
```

---

## Task 5: Wire Event Listeners to Feed MetricsAggregator

**Files:**

- Modify: `src/lib/neurolink.ts` — constructor (around line 679) and new private method

**Step 1: Add private method to create span from event data**

Add this method to the NeuroLink class:

```typescript
  /**
   * Initialize event listeners that feed span data to MetricsAggregator.
   * Listens to generation:end, stream:complete, and tool:end events
   * to create SpanData objects and record them for metrics.
   */
  private initializeMetricsListeners(): void {
    // Track generate() completions
    this.emitter.on("generation:end", (data: Record<string, unknown>) => {
      try {
        const result = data.result as Record<string, unknown> | undefined;
        const usage = result?.usage as { input?: number; output?: number; total?: number } | undefined;
        const analytics = result?.analytics as { cost?: number } | undefined;
        const provider = (data.provider as string) || (result?.provider as string) || "unknown";
        const model = (result?.model as string) || "unknown";
        const responseTime = (data.responseTime as number) || 0;

        const span = SpanSerializer.createGenerationSpan({
          provider,
          model,
          name: `gen_ai.${provider}.chat`,
        });

        const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
        endedSpan.durationMs = responseTime;

        // Enrich with tokens
        if (usage) {
          const enriched = SpanSerializer.enrichWithTokenUsage(endedSpan, {
            promptTokens: usage.input || 0,
            completionTokens: usage.output || 0,
            totalTokens: usage.total || (usage.input || 0) + (usage.output || 0),
          });
          Object.assign(endedSpan, enriched);
        }

        // Enrich with cost
        if (analytics?.cost && analytics.cost > 0) {
          const enriched = SpanSerializer.enrichWithCost(endedSpan, {
            inputCost: 0,
            outputCost: 0,
            totalCost: analytics.cost,
          });
          Object.assign(endedSpan, enriched);
        }

        this.metricsAggregator.recordSpan(endedSpan);
      } catch {
        // Non-blocking — metrics recording should never break generation
      }
    });

    // Track stream() completions
    this.emitter.on("stream:complete", (data: Record<string, unknown>) => {
      try {
        const metadata = data.metadata as Record<string, unknown> | undefined;
        const durationMs = (metadata?.durationMs as number) || 0;
        const chunkCount = (metadata?.chunkCount as number) || 0;
        const totalLength = (metadata?.totalLength as number) || 0;

        const span = SpanSerializer.createGenerationSpan({
          provider: "unknown",
          model: "unknown",
          name: "gen_ai.stream",
        });

        const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
        endedSpan.durationMs = durationMs;
        endedSpan.attributes["stream.chunk_count"] = chunkCount;
        endedSpan.attributes["stream.content_length"] = totalLength;

        this.metricsAggregator.recordSpan(endedSpan);
      } catch {
        // Non-blocking
      }
    });

    // Track tool executions
    this.emitter.on("tool:end", (data: Record<string, unknown>) => {
      try {
        const toolName = (data.toolName as string) || "unknown";
        const responseTime = (data.responseTime as number) || 0;
        const success = data.success as boolean;

        const span = SpanSerializer.createSpan(
          SpanType.TOOL_CALL,
          `tool.${toolName}`,
          {
            "tool.name": toolName,
            "tool.success": success,
          },
        );

        const endedSpan = SpanSerializer.endSpan(
          span,
          success ? SpanStatus.OK : SpanStatus.ERROR,
        );
        endedSpan.durationMs = responseTime;

        if (!success && data.error) {
          endedSpan.statusMessage = (data.error as Error).message || String(data.error);
        }

        this.metricsAggregator.recordSpan(endedSpan);
      } catch {
        // Non-blocking
      }
    });
  }
```

**Step 2: Call from constructor**

In the constructor (after `this.initializeLangfuse(...)` at line 679), add:

```typescript
this.initializeMetricsListeners();
```

**Step 3: Verify build**

Run: `pnpm run build 2>&1 | grep -c "error TS"`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/lib/neurolink.ts
git commit --no-verify -m "feat(observability): wire event listeners to feed MetricsAggregator"
```

---

## Task 6: Export Observability Types from SDK Index

**Files:**

- Modify: `src/lib/index.ts`

**Step 1: Add exports**

Add after the existing observability exports (around `buildObservabilityConfigFromEnv`):

```typescript
// Observability modules and types
export { MetricsAggregator } from "./observability/metricsAggregator.js";
export type {
  MetricsSummary,
  TraceView,
  LatencyStats,
  ProviderCostStats,
  ModelCostStats,
} from "./observability/metricsAggregator.js";
export { SpanSerializer } from "./observability/utils/spanSerializer.js";
export {
  SpanType,
  SpanStatus,
  GENAI_ATTRIBUTES,
} from "./observability/types/spanTypes.js";
export type {
  SpanData,
  SpanAttributes,
  SpanEvent,
} from "./observability/types/spanTypes.js";
export { TokenTracker } from "./observability/tokenTracker.js";
```

**Step 2: Verify build**

Run: `pnpm run build 2>&1 | grep -c "error TS"`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/index.ts
git commit --no-verify -m "feat(observability): export observability types and classes from SDK"
```

---

## Task 7: Verify Everything End-to-End

**Step 1: Full build**

Run: `pnpm run build 2>&1 | tail -5`
Expected: "All good!" — 0 errors

**Step 2: Unit tests**

Run: `pnpm run test:run 2>&1 | tail -10`
Expected: All tests pass (may have pre-existing TTS timeout)

**Step 3: CLI observability commands**

```bash
node dist/cli/index.js observability status 2>/dev/null
node dist/cli/index.js observability metrics 2>/dev/null
node dist/cli/index.js observability costs 2>/dev/null
node dist/cli/index.js telemetry status 2>/dev/null
```

Expected: All commands return output without crashing

**Step 4: SDK API test**

Create and run `test/audit/agent-test-api-wiring.ts`:

```typescript
#!/usr/bin/env npx tsx
import { NeuroLink } from "../../src/lib/neurolink.js";

let pass = 0,
  fail = 0;
function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    pass++;
    console.log(`  PASS ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`);
  }
}

async function main() {
  const sdk = new NeuroLink();

  // API methods exist
  assert(
    "getTelemetryStatus exists",
    typeof sdk.getTelemetryStatus === "function",
  );
  assert("getMetrics exists", typeof sdk.getMetrics === "function");
  assert("getSpans exists", typeof sdk.getSpans === "function");
  assert("getTraces exists", typeof sdk.getTraces === "function");
  assert("resetMetrics exists", typeof sdk.resetMetrics === "function");

  // getTelemetryStatus returns correct shape
  const status = sdk.getTelemetryStatus();
  assert("status.enabled is boolean", typeof status.enabled === "boolean");
  assert("status has openTelemetry", status.openTelemetry !== undefined);

  // getMetrics returns correct shape
  const metrics = sdk.getMetrics();
  assert(
    "metrics.totalSpans is number",
    typeof metrics.totalSpans === "number",
  );
  assert(
    "metrics.successRate is number",
    typeof metrics.successRate === "number",
  );
  assert("metrics.totalCost is number", typeof metrics.totalCost === "number");

  // getSpans returns array
  const spans = sdk.getSpans();
  assert("getSpans returns array", Array.isArray(spans));

  // getTraces returns array
  const traces = sdk.getTraces();
  assert("getTraces returns array", Array.isArray(traces));

  // Generate and check metrics populated
  try {
    const gen = await sdk.generate({
      input: { text: "Say hello" },
      provider: "vertex",
      model: "gemini-2.5-flash",
      disableTools: true,
    });
    assert("generate succeeds", !!gen.content);

    // Check metrics after generate
    const metricsAfter = sdk.getMetrics();
    assert(
      "totalSpans > 0 after generate",
      metricsAfter.totalSpans > 0,
      `got ${metricsAfter.totalSpans}`,
    );

    const spansAfter = sdk.getSpans();
    assert(
      "spans recorded after generate",
      spansAfter.length > 0,
      `got ${spansAfter.length}`,
    );
  } catch (e) {
    assert("generate succeeds", false, (e as Error).message);
  }

  // Reset and verify
  sdk.resetMetrics();
  const metricsReset = sdk.getMetrics();
  assert("totalSpans is 0 after reset", metricsReset.totalSpans === 0);

  console.log(`\n${pass} passed, ${fail} failed out of ${pass + fail}`);
  process.exit(fail > 0 ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Run: `npx tsx test/audit/agent-test-api-wiring.ts 2>/dev/null`
Expected: All assertions pass

**Step 5: Final commit**

```bash
git add test/audit/agent-test-api-wiring.ts
git commit --no-verify -m "test(observability): add API wiring verification test"
```

---

## Summary

| Task | What                                                        | Files                              | Complexity   |
| ---- | ----------------------------------------------------------- | ---------------------------------- | ------------ |
| 1    | Add imports + MetricsAggregator property                    | neurolink.ts                       | Trivial      |
| 2    | Implement getTelemetryStatus()                              | neurolink.ts                       | Simple       |
| 3    | Implement getMetrics()                                      | neurolink.ts                       | Trivial      |
| 4    | Implement getSpans/getTraces/resetMetrics/recordMetricsSpan | neurolink.ts, metricsAggregator.ts | Medium       |
| 5    | Wire event listeners to feed spans                          | neurolink.ts                       | Medium       |
| 6    | Export types from index.ts                                  | index.ts                           | Trivial      |
| 7    | End-to-end verification                                     | All                                | Verification |

**Total: 3 files modified, ~200 lines added, 0 files created (except test)**
