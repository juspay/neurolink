---
title: "Observability Guide"
description: Send every AI operation to Langfuse with input, output, usage, cost and model parameters
keywords:
  [observability, langfuse, opentelemetry, tracing, monitoring, telemetry]
---

# Observability Guide

NeuroLink exports every AI operation to [Langfuse](https://langfuse.com/). Setup is environment variables only.

## Architecture

One instrumentation feeds every backend:

```
OpenTelemetry spans (observe / withSpan)
  -> ExporterSpanProcessor        observation spans -> SpanData
  -> ExporterRegistry             sampling, circuit breaker
  -> LangfuseExporter
```

NeuroLink's own provider uses this pipeline, with `LangfuseExporter` registered when Langfuse is enabled. The Langfuse exporter queues spans without blocking the caller and posts them in batches to Langfuse's OTLP endpoint (`POST /api/public/otel/v1/traces`, OTLP/HTTP JSON, Basic auth with your keys). Spans that are not observations (health checks, auth, middleware) are skipped, and their children are re-parented onto the nearest exported ancestor so the tree stays connected.

> **Warning: full input and output are captured by default.** Prompts, system prompts, tool arguments, tool results and model output are sent to Langfuse as they are. If your data is sensitive, set `mask` before enabling tracing. See [Masking sensitive data](#masking-sensitive-data).

> **Warning: tracing turns on automatically.** If `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are present in the environment, NeuroLink starts exporting with no code change. Upgrading with those variables already set starts sending data. Set `observability: { langfuse: false }` to opt out.

## Setup

```bash
export LANGFUSE_PUBLIC_KEY=pk-lf-...
export LANGFUSE_SECRET_KEY=sk-lf-...
export LANGFUSE_BASE_URL=https://cloud.langfuse.com   # optional
```

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();
await neurolink.generate({ input: { text: "Hello" } });
```

### Environment variables

| Variable                             | Purpose                                                                                                                                                                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LANGFUSE_PUBLIC_KEY`                | Langfuse public key (required to auto-enable)                                                                                                                                                                              |
| `LANGFUSE_SECRET_KEY`                | Langfuse secret key (required to auto-enable)                                                                                                                                                                              |
| `LANGFUSE_BASE_URL`                  | Langfuse host; defaults to Langfuse Cloud                                                                                                                                                                                  |
| `LANGFUSE_TRACING_ENVIRONMENT`       | Environment label on every trace                                                                                                                                                                                           |
| `LANGFUSE_RELEASE`                   | Release label on every trace                                                                                                                                                                                               |
| `OTEL_EXPORTER_OTLP_ENDPOINT`        | Also export traces and metrics to an OTLP collector                                                                                                                                                                        |
| `NEUROLINK_SPAN_ATTRIBUTE_MAX_CHARS` | Largest serialized span input, output or tool payload in characters (default 40000, minimum 10000). Anything over it is trimmed to valid JSON, keeping the user's question, then this turn's newest messages, then history |

### Disable or override

```typescript
new NeuroLink({ observability: { langfuse: false } });

new NeuroLink({
  observability: {
    langfuse: {
      publicKey: "pk-lf-...",
      secretKey: "sk-lf-...",
      baseUrl: "https://langfuse.example.com",
      environment: "production",
      release: "2026.10.1",
      exportMode: "batched",
      flushAt: 50,
      flushInterval: 5,
    },
  },
});
```

Every field is optional and falls back to its `LANGFUSE_*` variable. The type is `NeurolinkLangfuseConfig`.

| Field           | Meaning                                                      |
| --------------- | ------------------------------------------------------------ |
| `publicKey`     | Langfuse public key                                          |
| `secretKey`     | Langfuse secret key                                          |
| `baseUrl`       | Langfuse host                                                |
| `environment`   | Environment label                                            |
| `release`       | Release label                                                |
| `mask`          | Function applied to input, output and metadata before export |
| `exportMode`    | `"batched"` (default) or `"immediate"`                       |
| `flushAt`       | Spans buffered before a batch is sent (default 15)           |
| `flushInterval` | Seconds between batch flushes (default 5)                    |

## Per-call context

Pass `context` on `generate`, `stream` and `decide`. The values are attached to every span the call creates, including tool calls and fallback attempts, so one call is one trace.

```typescript
await neurolink.generate({
  input: { text: "Summarize this ticket" },
  context: {
    userId: "user-123",
    sessionId: "session-456",
    tags: ["support", "premium"],
    traceName: "ticket-summary",
    conversationId: "conv-789",
    requestId: "req-abc",
    metadata: { region: "us-east-1" },
  },
});
```

| Field             | Recorded as                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `userId`          | Trace user                                                                                                                                |
| `sessionId`       | Trace session                                                                                                                             |
| `tags`            | Trace tags                                                                                                                                |
| `traceName`       | Trace name                                                                                                                                |
| `conversationId`  | Metadata key `conversationId`                                                                                                             |
| `requestId`       | Metadata key `requestId`                                                                                                                  |
| `metadata`        | Metadata; values up to 200 characters are on every observation, longer values and arrays are recorded in full on the trace only           |
| `observationName` | Name of the root observation of this call; default `generate` or `stream`; not propagated to child observations or used as the trace name |

### setLangfuseContext

Wrap your own code to attach the same attributes to everything inside it, including spans you create yourself.

```typescript
import { NeuroLink, setLangfuseContext } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await setLangfuseContext(
  { userId: "user-123", sessionId: "session-456", traceName: "chat" },
  () => neurolink.generate({ input: { text: "Hello" } }),
);
```

`setLangfuseContext(params: NeurolinkTraceContext, fn)` returns whatever `fn` returns. It is a thin wrapper over Langfuse's `propagateAttributes`.

## What is recorded

### Naming

No span name, attribute key or metadata key contains the product name. Names never carry per-execution values: the model and provider are fields, the step number is metadata.

| Observation                | Name                                  | Langfuse type | Parent                 |
| -------------------------- | ------------------------------------- | ------------- | ---------------------- |
| `generate` / `stream` call | `generate` / `stream`                 | `agent`       | none (trace root)      |
| Fallback attempt           | `generate.attempt` / `stream.attempt` | `span`        | root                   |
| Agent loop step            | `step` (`step_index` metadata)        | `span`        | the attempt span       |
| One model request          | `generate` / `stream`                 | `generation`  | its `step`             |
| Tool execution             | the tool's name, e.g. `get_weather`   | `tool`        | the `step` that ran it |
| `decide`                   | `decide`                              | `generation`  | caller or root         |

A model request is named after the API the caller used (`NeuroLink.generate` or `provider.generate` gives `generate`, `NeuroLink.stream` or `provider.stream` gives `stream`). Its model is the observation's model field (the model the provider reported, falling back to the requested one) and the provider id is the `provider` metadata key.

The trace name is `context.traceName` when given, otherwise the operation name (`generate`, `stream`). An outer `setLangfuseContext` takes precedence over per-call `context` for user, session and trace name.

Embeddings, RAG, workflow, evaluation, transcribe, TTS and media tracing are not yet recorded. The root also sets trace-level input and output; a `generate` or `stream` nested inside another turn does not.

### Steps and chat format

Each iteration of the agent loop gets one `step` span with its one-based index in the `step_index` metadata. It parents that iteration's generation and the tool observations the model requested in it, so a multi-tool turn reads as step 1 (call, tools), step 2 (call, tools), and so on.

Generation input is a chat message array with the system message first. Generation output is an assistant message array: `content`, plus `reasoning` and `tool_calls` (`{ id, type: "function", function: { name, arguments } }`) when present. Langfuse renders both as a conversation.

Generation details:

- **Usage** includes input, output, total, cache read, cache creation and reasoning tokens, whatever naming the provider uses.
- **Cost** is computed from NeuroLink's pricing table and recorded as `costDetails.total`.
- **Model parameters** are temperature, max tokens, top-p and thinking level.
- **Time to first token** is recorded as the generation's completion start time for streams.
- **Level** is `WARNING` for a `length` or `content-filter` finish, an aborted call, an early `break` out of a stream, or an empty output, and `ERROR` when the call throws.
- **Streams** end their spans when the stream finishes, is abandoned or is aborted.

## Masking sensitive data

`mask` runs on span input and output before export. It receives `{ data }` and returns the value to send.

```typescript
const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      mask: ({ data }) =>
        JSON.stringify(data).replace(/\b\d{13,16}\b/g, "[card]"),
    },
  },
});
```

`mask` also runs on trace and observation metadata. If it throws, the value is replaced by `<fully masked>`. Provider credentials are already redacted from recorded values. Everything else is captured as is.

## Langfuse exporter behaviour

- **Endpoint.** `POST {baseUrl}/api/public/otel/v1/traces` as OTLP/HTTP JSON. Requests are cut at 500 spans or 3.5 MB.
- **Observation types.** Agent, generation, tool, step, attempt and the other observation types reach Langfuse with their native type, model, parameters, usage, cost and first-token time.
- **Identity.** User, session, trace name, tags and trace metadata are set on every observation, not only the root.
- **Environment and release.** The config field, then `LANGFUSE_TRACING_ENVIRONMENT` / `LANGFUSE_RELEASE`; they fill spans that do not carry them already.
- **Batching.** Spans are sent when `flushAt` spans are queued, every `flushInterval` seconds, on `flushOpenTelemetry()` and on shutdown. `exportMode: "immediate"` sends each span as it ends.
- **Failures.** A request that fails with 429, 5xx or a network error is retried with exponential backoff. Other 4xx responses are not retried. Spans Langfuse reports as rejected (`partialSuccess`) are logged once as a warning and not re-sent. A 401 or 403 logs one warning per process ("Langfuse credentials rejected") and is not retried. Delivery never throws into your code.

## External OpenTelemetry provider

If your application registers its own global `TracerProvider`, NeuroLink creates no provider. Other backends: add that vendor's span processor to your provider, or set `OTEL_EXPORTER_OTLP_ENDPOINT`. For Langfuse choose one of two recipes.

**(a) Exporter pipeline (recommended).** Add `createExporterSpanProcessor()` to your provider and give NeuroLink the Langfuse keys, either through `new NeuroLink({ observability: { langfuse } })` or the `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` environment variables. NeuroLink registers its `LangfuseExporter` on the shared exporter registry, which the processor reads, so `mask`, batching, chunking and retry from the section above all apply. Register the processor before the first NeuroLink call; spans that end before the exporter is registered are not exported.

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { createExporterSpanProcessor, NeuroLink } from "@juspay/neurolink";

const sdk = new NodeSDK({
  spanProcessors: [createExporterSpanProcessor()],
});
sdk.start();

const neurolink = new NeuroLink({
  observability: {
    langfuse: { publicKey: "pk-lf-...", secretKey: "sk-lf-..." },
  },
});
```

**(b) `LangfuseSpanProcessor`.** Add `new LangfuseSpanProcessor()` from `@langfuse/otel` with its defaults; no custom `shouldExportSpan` filter is needed. Every observation span NeuroLink emits carries a `gen_ai.observation.type` attribute, which the default filter exports, while infrastructure spans are not exported. This path sends OTLP and keeps native Langfuse observation types. The processor takes its keys, `mask`, `flushAt`, `flushInterval`, `exportMode`, environment and release from its own constructor options and `LANGFUSE_*` variables. It does not read `observability.langfuse` from `new NeuroLink(...)`, so those settings must be passed to the processor, and NeuroLink's exporter masking, 500-span / 3.5 MB chunking and retry policy do not apply to it.

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NeuroLink } from "@juspay/neurolink";

const sdk = new NodeSDK({
  spanProcessors: [new LangfuseSpanProcessor()],
});
sdk.start();

const neurolink = new NeuroLink();
```

Register your provider before the first NeuroLink call. NeuroLink never flushes or shuts down a provider it did not create. `@langfuse/otel` is not a dependency of NeuroLink; install it for recipe (b).

## Initialisation

Telemetry starts synchronously and lazily, once per process, the first time any NeuroLink span is created. That includes direct provider calls with no `NeuroLink` instance, for example `AIProviderFactory.createProvider(...).generate(...)`, which are traced the same way.

An explicit `observability` config passed to `new NeuroLink()` wins over `LANGFUSE_*` variables when the instance is constructed before any span is created. If telemetry has already started, the config is ignored and a debug message is logged once.

## Serverless and short-lived processes

Spans are batched. Flush before the process freezes or exits:

```typescript
import { flushOpenTelemetry, shutdownOpenTelemetry } from "@juspay/neurolink";

await flushOpenTelemetry();
await shutdownOpenTelemetry();
```

Or send each span as it ends:

```typescript
new NeuroLink({
  observability: { langfuse: { exportMode: "immediate" } },
});
```

`shutdownOpenTelemetry()` is terminal for the process: telemetry cannot restart afterwards. While other `NeuroLink` instances are still alive it only flushes.

## Health

```typescript
import {
  getLangfuseHealthStatus,
  isOpenTelemetryInitialized,
} from "@juspay/neurolink";

const { isHealthy, initialized, hasProcessor, usingExternalProvider } =
  getLangfuseHealthStatus();
```

`isHealthy` and `hasProcessor` are true only while a Langfuse exporter is registered, whether NeuroLink owns the provider or runs beside a host provider. With a host provider, the exporter still needs `createExporterSpanProcessor()` on that provider to receive spans.

## Proxy

The proxy records the pool account label (not an email address), sets `userId` and `sessionId` from `x-neurolink-user-id` and `x-neurolink-session-id`, names traces `proxy:<model>`, and records request and response bodies, usage, cost and time to first token. See the [Telemetry Guide](../telemetry-guide.md#-proxy-telemetry-otlp-triple-signal-export) and [Claude Proxy Observability](./claude-proxy-observability.md).

## Voice (LiveKit)

Pipeline mode traces through `stream()` and carries the `voice` tag. Realtime mode records one trace per conversation turn, with transcripts as input and output and tool calls as `tool` records, and only when voice memory is enabled. The `realtime` generation record carries the model id and the provider of the realtime backend (`vertex` for Gemini Live, `xai` for Grok Voice). Full transcripts are sent to Langfuse by default; use `mask` for sensitive data.

## Troubleshooting

| Symptom                           | Check                                                                                                                                                                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nothing reaches Langfuse          | Both keys set and `langfuse` not `false`; `getLangfuseHealthStatus()`; call `flushOpenTelemetry()` on exit                                                                                                                         |
| Spans missing with own OTEL setup | Add `createExporterSpanProcessor()` to your provider and pass the Langfuse keys to NeuroLink (or set `LANGFUSE_*`), or use `new LangfuseSpanProcessor()` with its own keys; register the processor before the first NeuroLink call |
| Wrong host                        | Variable is `LANGFUSE_BASE_URL`, not `LANGFUSE_BASEURL`                                                                                                                                                                            |
| Traces stop after shutdown        | `shutdownOpenTelemetry()` cannot be undone in the same process; use `flushOpenTelemetry()`                                                                                                                                         |

## Migrating from the previous version

This release is breaking.

### Configuration fields

| Removed                                                       | Replacement                                                             |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `langfuse.enabled`                                            | Set the keys to enable; `langfuse: false` disables                      |
| `langfuse.userId`, `langfuse.sessionId`                       | Per-call `context.userId`, `context.sessionId`, or `setLangfuseContext` |
| `useExternalTracerProvider`, `autoDetectExternalProvider`     | Automatic: a registered global provider is detected                     |
| `skipLangfuseSpanProcessor`                                   | Register your own provider; NeuroLink then adds nothing                 |
| `mediaUploadEnabled`, `LANGFUSE_MEDIA_UPLOAD_ENABLED`         | Removed; the exporter does not upload media                             |
| `autoDetectOperationName`, `operationName`, `traceNameFormat` | `context.traceName`                                                     |
| `customAttributes`                                            | `context.metadata`                                                      |
| `conversationId`, `requestId` on the config                   | `context.conversationId`, `context.requestId` (stored as metadata)      |
| `NEUROLINK_TELEMETRY_ENABLED`                                 | Removed; the `LANGFUSE_*` keys enable tracing                           |
| `LANGFUSE_BASEURL` hint                                       | `LANGFUSE_BASE_URL`                                                     |

### Exports

| Removed                                                                 | Replacement                                                                             |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `initializeOpenTelemetry`                                               | Automatic on `new NeuroLink()`                                                          |
| `getLangfuseSpanProcessor`                                              | `createExporterSpanProcessor(registry)` or `new LangfuseSpanProcessor()`                |
| `getTracerProvider`, `getTracer`                                        | `trace.getTracer()` from `@opentelemetry/api`                                           |
| `getSpanProcessors`                                                     | Add `createExporterSpanProcessor()` to your provider                                    |
| `createContextEnricher`                                                 | `setLangfuseContext` or per-call `context`                                              |
| `isUsingExternalTracerProvider`                                         | `getLangfuseHealthStatus().usingExternalProvider`                                       |
| `isLangfuseInternalSpan`, `langfuseShouldExportSpan`                    | Removed; only observation spans are exported                                            |
| `getLangfuseContext`                                                    | Removed                                                                                 |
| `runWithCurrentLangfuseContext`                                         | `context.bind(context.active(), fn)` from `@opentelemetry/api`                          |
| `buildObservabilityConfigFromEnv`                                       | Removed; env keys are read automatically                                                |
| `createMockLangfuseClient`                                              | No longer exported from the package root; still exported by the evaluation hooks module |
| `TelemetryService`                                                      | Removed, with its `tts_failures` and `tts_failure_latency_ms` metrics                   |
| `initializeTelemetry`, `getTelemetryStatus` (root)                      | Removed; use `getLangfuseHealthStatus`                                                  |
| `OpenTelemetryConfig`, `ExtendedObservabilityConfig`, `*ExporterConfig` | `ObservabilityConfig`, `NeurolinkLangfuseConfig`                                        |

### CLI

| Removed                              | Replacement                            |
| ------------------------------------ | -------------------------------------- |
| `neurolink telemetry configure`      | Set `LANGFUSE_*` environment variables |
| `neurolink telemetry list-exporters` | `neurolink telemetry status`           |
| `neurolink observability exporters`  | `neurolink observability status`       |

`ExporterRegistry`, `NoOpExporter`, `AlwaysSampler`, `NeverSampler` and the vendor exporter classes are unchanged. NeuroLink wires only `LangfuseExporter`. `LangfuseExporter`, `ExporterSpanProcessor` and `createExporterSpanProcessor` are new root exports.

## See Also

- [Telemetry Guide](../telemetry-guide.md)
- [Claude Proxy Observability](./claude-proxy-observability.md)
- [Analytics Reference](../reference/analytics.md)
