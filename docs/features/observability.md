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

NeuroLink's own provider uses this pipeline, with `LangfuseExporter` registered when Langfuse is enabled. The Langfuse exporter queues spans without blocking the caller and posts them in batches to Langfuse's OTLP endpoint (`POST /api/public/otel/v1/traces`, OTLP/HTTP JSON, Basic auth with your keys). Every observation is exported: model calls, attempts, steps and tools, and the spans of the RAG, workflow, evaluation, processor and autoresearch features, which arrive as a plain `span` observation. Spans that are not observations (health checks, auth, middleware and NeuroLink's HTTP, MCP, memory and file helper spans), wrapper spans NeuroLink marks internal, and spans another library creates on a shared provider that do not describe a model call are skipped, and their children are re-parented onto the nearest exported ancestor so the tree stays connected.

> **Warning: full input and output are captured by default.** Prompts, system prompts, tool arguments, tool results and model output are sent to Langfuse as they are. If your data is sensitive, set `mask` (or `redactIO`) before enabling tracing; it applies to what is sent to Langfuse only. See [Masking sensitive data](#masking-sensitive-data).

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

| Variable                             | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LANGFUSE_PUBLIC_KEY`                | Langfuse public key (required to auto-enable)                                                                                                                                                                                                                                                                                                                                                                                                |
| `LANGFUSE_SECRET_KEY`                | Langfuse secret key (required to auto-enable)                                                                                                                                                                                                                                                                                                                                                                                                |
| `LANGFUSE_BASE_URL`                  | Langfuse host; defaults to Langfuse Cloud                                                                                                                                                                                                                                                                                                                                                                                                    |
| `LANGFUSE_TRACING_ENVIRONMENT`       | Environment label on every Langfuse trace. The OTLP resource's `deployment.environment` is the same value and falls back to `LANGFUSE_ENVIRONMENT`, then `PUBLIC_APP_ENVIRONMENT`; Langfuse traces do not read those two                                                                                                                                                                                                                     |
| `LANGFUSE_RELEASE`                   | Release label on every Langfuse trace. The OTLP resource's `service.version` is the same value and falls back to `PUBLIC_APP_VERSION`; Langfuse traces do not read it                                                                                                                                                                                                                                                                        |
| `LANGFUSE_ENABLED`                   | `false`, `0`, `off` or `no` keeps Langfuse off although both keys are set. It governs the keys wherever they come from the environment: `neurolink proxy start`, and an `observability.langfuse` options object that leaves the keys to the environment (only a `mask` or an `environment`), obey it. A setting passed in code wins over it when it turns Langfuse on itself: `langfuse: true`, `enabled: true`, or both keys in the options |
| `NEUROLINK_RECORD_INPUTS`            | Set to `false` to keep inputs (prompts, messages, tool arguments, proxy request bodies) out of every trace; outputs are still recorded                                                                                                                                                                                                                                                                                                       |
| `NEUROLINK_MASK_CREDENTIAL_ENTRIES`  | Set to `true` to also mask the value of a `{ name, value }` or `{ key, value }` entry whose name is a credential (headers, environment lists, form fields) and a credential inside an object key, in prompts and tool inputs and outputs. Off by default: the masker then reads keys and text only, as in the released build.                                                                                                                |
| `NEUROLINK_PROXY_TRACE_BODY_LOGGING` | Set to `true` to record Claude and Codex proxy request and response bodies and the content of translated requests on traces; off by default. See [Proxy](#proxy)                                                                                                                                                                                                                                                                             |
| `OTEL_EXPORTER_OTLP_ENDPOINT`        | Also export traces and metrics to an OTLP collector, only when NeuroLink owns the tracer provider. Ignored, with one warning, when your application registered its own `TracerProvider` first; see [External OpenTelemetry provider](#external-opentelemetry-provider)                                                                                                                                                                       |
| `OTEL_SERVICE_NAME`                  | `service.name` of NeuroLink's OTLP export (default `ai-service`; `neurolink proxy start` sets `neurolink-proxy`)                                                                                                                                                                                                                                                                                                                             |
| `NEUROLINK_TELEMETRY_ENABLED`        | `true` records NeuroLink's [metrics](#metrics) whatever else is set. A registered `MeterProvider` or `OTEL_EXPORTER_OTLP_ENDPOINT` already turns them on, and without a `MeterProvider` they go nowhere, so on its own it changes nothing; it does not turn tracing on                                                                                                                                                                       |
| `NEUROLINK_TELEMETRY_EXIT_FLUSH`     | `false`, `0`, `off` or `no` skips the flush that runs when a script ends on its own (`beforeExit`), so the process ends as soon as it has no work, with no wait for an unreachable collector. See [Serverless and short-lived processes](#serverless-and-short-lived-processes)                                                                                                                                                              |
| `NEUROLINK_SPAN_ATTRIBUTE_MAX_CHARS` | Largest serialized span input, output or tool payload in characters (default 40000, minimum 10000). Anything over it is trimmed to valid JSON, keeping the user's question, then this turn's newest messages, then history                                                                                                                                                                                                                   |

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

Every field is optional. `publicKey`, `secretKey`, `baseUrl`, `environment` and `release` fall back to the variables above; the others have the defaults below. The type is `NeurolinkLangfuseConfig`.

| Field           | Meaning                                                                                                                                                                                                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `enabled`       | `false` turns Langfuse off although keys are set (from untyped config, the strings `"false"`, `"0"`, `"off"` and `"no"` do too); any other value, or leaving it out, leaves it on. `LANGFUSE_ENABLED` is read only when the object leaves the keys to the environment and does not set `enabled: true`                                                                         |
| `publicKey`     | Langfuse public key                                                                                                                                                                                                                                                                                                                                                            |
| `secretKey`     | Langfuse secret key                                                                                                                                                                                                                                                                                                                                                            |
| `baseUrl`       | Langfuse host                                                                                                                                                                                                                                                                                                                                                                  |
| `environment`   | Environment label                                                                                                                                                                                                                                                                                                                                                              |
| `release`       | Release label                                                                                                                                                                                                                                                                                                                                                                  |
| `mask`          | Function applied to input, output and metadata before they are sent to Langfuse; see [Masking sensitive data](#masking-sensitive-data)                                                                                                                                                                                                                                         |
| `redactIO`      | `true` leaves input and output out of what is sent to Langfuse instead of masking them (default `false`)                                                                                                                                                                                                                                                                       |
| `exportMode`    | `"batched"` (default) or `"immediate"`                                                                                                                                                                                                                                                                                                                                         |
| `flushAt`       | Spans buffered before a batch is sent (default 15)                                                                                                                                                                                                                                                                                                                             |
| `flushInterval` | Seconds between batch flushes (default 5)                                                                                                                                                                                                                                                                                                                                      |
| `flushBudgetMs` | Longest a `flush()` or shutdown waits for Langfuse deliveries before dropping what is still in flight (default 3000). `flushOpenTelemetry()`, `shutdownOpenTelemetry()` and the exit flush also wait at most this long for the OTLP collector, and it is the OTLP exporters' request timeout unless `OTEL_EXPORTER_OTLP_TIMEOUT` (or its `_TRACES_` / `_METRICS_` form) is set |

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

The observations below (`generate`, `stream`, `decide`, attempts, steps and tools) carry no product name in their span names, attribute keys or metadata keys. Names never carry per-execution values: the model and provider are fields, the step number is metadata. The product name remains in the plain spans listed under [Other spans](#other-spans) and in the proxy root's `neurolink.user_id`, `neurolink.session_id` and `neurolink.conversation_id` attributes.

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

Embeddings, transcribe, TTS and media tracing are not yet recorded. The root also sets trace-level input and output; a `generate` or `stream` nested inside another turn does not.

### Other spans

Spans from the RAG, workflow, file, memory, context and evaluation code are exported as plain `span` records with their name, timing, status and their own attributes. They keep their `neurolink.*` names: `neurolink.rag.search`, `neurolink.rag.rerank`, `neurolink.rag.chunk`, `neurolink.workflow.*` (`run`, `run.streaming`, `response.condition`, `judge.score`, `ensemble.execute`, `layers.execute`), `neurolink.file.process`, `neurolink.file.video.process`, `neurolink.context.compact`, `neurolink.memory.summarize` and `neurolink.evaluation.ragas`.

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

`mask` runs on the input, output and metadata sent to Langfuse. It receives `{ data }` and returns the value to send.

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

`mask` and `redactIO` act on what NeuroLink sends to Langfuse, and on nothing else. They cover the trace and observation input and output (`langfuse.observation.input`, `langfuse.observation.output`, `langfuse.trace.input`, `langfuse.trace.output`); `redactIO: true` leaves those out of the request, and `mask` rewrites them instead. `mask` also runs on trace and observation metadata, whether or not the metadata is an object. If it throws, the value is replaced by `<fully masked>`.

Everything else goes to Langfuse as it was recorded: the status message, `exception.message`, `error.message`, a tool's `tool.error.message` and a provider retry's `retry.error`, tool-call attributes, the `proxy.body` attribute of proxy body events, event attributes, and the prompt and completion attributes another library's GenAI instrumentation writes on spans that are exported with NeuroLink's. The policy does not reach any other sink either: an exporter you register with `registerExporter`, the spans NeuroLink sends to `OTEL_EXPORTER_OTLP_ENDPOINT`, and `getSpans()` receive the values as they were recorded. If one of them must not see content, take it out where it is recorded (`NEUROLINK_RECORD_INPUTS=false`) or in that sink's own processing.

NeuroLink adds no credential masking of its own to error text. A failed call's status message, `error.message`, `tool.error.message`, `retry.error` and exception text are recorded as the provider returned them, in every sink, as the released build did, so an error that echoes a key reaches the sinks with the key. Input, output and tool arguments and results keep the credential masking they always had. To keep a credential out of error text, filter it in a custom exporter or keep it out of the provider's error.

## Langfuse exporter behaviour

- **Endpoint.** `POST {baseUrl}/api/public/otel/v1/traces` as OTLP/HTTP JSON. Requests are cut at 500 spans or 3.5 MB.
- **Observation types.** Agent, generation, tool, step, attempt and the other observation types reach Langfuse with their native type, model, parameters, usage, cost and first-token time.
- **Identity.** User, session, trace name, tags and trace metadata are set on every observation, not only the root.
- **Environment and release.** The config field, then `LANGFUSE_TRACING_ENVIRONMENT` / `LANGFUSE_RELEASE`; they fill spans that do not carry them already. The OTLP resource's `deployment.environment` and `service.version` also read `LANGFUSE_ENVIRONMENT`, `PUBLIC_APP_ENVIRONMENT` and `PUBLIC_APP_VERSION`; Langfuse traces do not.
- **Batching.** Spans are sent when `flushAt` spans are queued, every `flushInterval` seconds, on `flushOpenTelemetry()` and on shutdown. `exportMode: "immediate"` sends each span as it ends.
- **Failures.** A request that fails with 429, 5xx or a network error is retried with exponential backoff, or after the `Retry-After` a 429 or 503 names, up to 60 seconds and never past a flush's budget. Other 4xx responses are not retried. Spans Langfuse reports as rejected (`partialSuccess`) are logged once as a warning and not re-sent; a success whose body is not an object, or whose rejected count is not a whole number between zero and the spans sent, counts as all delivered. At most 4 export requests are in flight at once. Spans that end meanwhile wait, up to 10,000 of them; when Langfuse stops answering, the oldest waiting spans are dropped, counted in `failedSpans` and in the errors of `healthCheck()`, and warned about once a minute. Spans that end during shutdown are sent within the flush budget or counted as dropped. A 401 or 403 logs one warning per process ("Langfuse credentials rejected") and is not retried. Delivery never throws into your code. A batch that is dropped is reported in the exporter's result (`success: false` with `failedCount`), in a `Dropped N of M spans` warning and in the errors of `healthCheck()`. While Langfuse took none of the latest batch (it refused the request, the request failed, or `partialSuccess` rejected every span), the exporter's status and `healthCheck()` read unhealthy with an error naming the dropped count, until a batch is accepted again. These failures do not open the circuit breaker, so later spans are still delivered.

## Metrics

NeuroLink also records OpenTelemetry metrics, on one meter named `neurolink-ai`. They are recorded only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set, when `NEUROLINK_TELEMETRY_ENABLED=true`, or when a global `MeterProvider` is registered (your application's, or NeuroLink's own); a global `TracerProvider` alone, NeuroLink's included, does not turn them on. They are written to the global `MeterProvider`. NeuroLink registers one, exporting to `$OTEL_EXPORTER_OTLP_ENDPOINT/v1/metrics` every 15 seconds, only when it owns the tracer provider and the endpoint is set; beside a host provider they go to the `MeterProvider` your application registered, and nowhere when it registered none.

| Metric                                    | Kind                    | Labels                                                                                                           | Recorded for                                                                                                                                                                                                                                  |
| ----------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ai_requests_total`                       | counter                 | `provider`, `model`                                                                                              | each `generate()` that finishes in `BaseProvider.finalizeNativeGenerate` (the native generate path of providers such as Anthropic, SageMaker and the OpenAI Chat Completions family), and each proxied request whose usage the proxy captured |
| `ai_request_duration_ms`                  | histogram, milliseconds | `provider`, `model`                                                                                              | the same requests                                                                                                                                                                                                                             |
| `ai_tokens_used_total`                    | counter, total tokens   | `provider`, `model`                                                                                              | the same requests                                                                                                                                                                                                                             |
| `ai_cost_usd_total`                       | counter, US dollars     | `provider`, `model`                                                                                              | the same requests, when the model's price is known                                                                                                                                                                                            |
| `mcp_tool_calls_total`                    | counter                 | `tool`, `success`, `duration_bucket` (`fast` under 100 ms, `medium` under 500 ms, `slow` under 1 s, `very_slow`) | each tool call to an external MCP server; `success` is `false` for a thrown error and for a resolved MCP error result                                                                                                                         |
| `custom_tts_failures`                     | counter                 | `provider`, `error_code`, and `retriable` when known                                                             | each failed TTS synthesis                                                                                                                                                                                                                     |
| `custom_tts_failure_latency_ms_histogram` | histogram, milliseconds | the same                                                                                                         | each failed TTS synthesis                                                                                                                                                                                                                     |

`ai_provider_errors_total`, `connections_total` and `response_time_ms` are created on the same meter, but nothing in the package records them, as before this release. The active-connection count that `TelemetryService.recordConnectionClosed` kept is not restored, and the recording functions are not exported. The proxy records its own `proxy_*` metrics; see [Claude Proxy Observability](./claude-proxy-observability.md).

## External OpenTelemetry provider

If your application registers its own global `TracerProvider` before tracing starts, NeuroLink creates no provider. `OTEL_EXPORTER_OTLP_ENDPOINT` is then ignored: NeuroLink logs one warning and exports no traces or metrics to it, so add an OTLP exporter, or any other vendor's span processor, to your own providers. `neurolink.getTelemetryStatus().openTelemetry` then reports `usingExternalProvider: true` (its `enabled` stays whether tracing is initialized, as before), and `neurolink telemetry status` and `neurolink observability status` print the endpoint as ignored. NeuroLink's [metrics](#metrics) are recorded on the `MeterProvider` your application registers. For Langfuse choose one of two recipes.

The host provider must register a context manager, which `NodeTracerProvider.register()` and `NodeSDK` do. Without one OpenTelemetry cannot carry context between calls, so `setLangfuseContext` user, session and metadata never reach NeuroLink's spans and child spans lose their parents; NeuroLink logs a warning when it finds none. Shutting the host provider down shuts the shared exporters down, as `createExporterSpanProcessor()` always did. If the host rebuilds its provider, pass `createExporterSpanProcessor(undefined, { shutdownExporters: false })`: that processor only flushes the exporters on shutdown, so a rebuilt provider that adds one again keeps exporting.

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

Register your provider before tracing starts, that is before the first `new NeuroLink({ observability })` and the first NeuroLink call (see [Initialisation](#initialisation)); otherwise NeuroLink creates and registers its own provider and keeps it for the process. NeuroLink never flushes or shuts down a provider it did not create. `@langfuse/otel` is not a dependency of NeuroLink; install it for recipe (b).

## Initialisation

Tracing starts synchronously, once per process, at the first of these:

- `new NeuroLink({ observability })`. A constructor without an `observability` block starts nothing.
- The first `generate`, `stream`, `decide` or `tryDecide` call on any `NeuroLink` instance.
- The first span NeuroLink's own code creates, on an entry that loads the start-up module: the main package entry, `@juspay/neurolink/server` and `@juspay/neurolink/livekit`, and the `./rag`, `./workflow`, `./evaluation`, `./processors` and `./autoresearch` subpath entries. That includes direct provider calls with no `NeuroLink` instance, for example `AIProviderFactory.createProvider(...).generate(...)` imported from the main entry.

The lightweight `@juspay/neurolink/client` entry does not load the OpenTelemetry Node SDK and does not start tracing: its spans go to a `TracerProvider` your application registered, and are dropped when there is none. A Node application that relied on this entry alone to start tracing (the previous version did) adds `import "@juspay/neurolink"` once at start-up.

Tracing configuration is process-wide and the first start wins. An `observability` config passed to `new NeuroLink()` wins over the `LANGFUSE_*` variables only when that construction starts tracing. A later instance's config is ignored: if it differs from the first, NeuroLink logs a warning that names the options that differ, once per set of differing options; an identical config logs one debug line. A start before Langfuse or OTLP is configured sets nothing up, so a later config or environment can still start tracing, unless `langfuse: false` was passed. `langfuse: true`, or an options object, without both keys counts as Langfuse not configured: NeuroLink warns once that the keys are missing and, unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set, starts nothing, so a later config with keys still starts tracing. To run beside your own OpenTelemetry setup, register your `TracerProvider` before tracing starts; see [External OpenTelemetry provider](#external-opentelemetry-provider).

Importing the main package entry loads the OpenTelemetry SDK, both OTLP exporters and the metrics SDK at import, even when telemetry stays off, and so does importing one of the subpath entries above. That is the cost of starting tracing without an initialization call, and it adds to start-up time in a cold process. The shared tracers, which the client entry uses, load none of them.

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

A script that ends on its own flushes pending spans and metrics once the event loop is empty (`beforeExit`). An explicit `process.exit()`, a fatal signal or an uncaught exception skips that flush, so call `await flushOpenTelemetry()` before them. `flushOpenTelemetry()`, `shutdownOpenTelemetry()` and that exit flush wait at most the flush budget (`observability.langfuse.flushBudgetMs`, default 3000 ms) for the OTLP collector, and for Langfuse within the same budget. What did not complete is logged as a warning, and `flushOpenTelemetry()` then rejects with `Flush failed` (its `cause` lists the reasons), as it always did; the exit flush and `shutdown()` catch that themselves, so a collector or Langfuse that cannot be reached does not hold a script past the budget: NeuroLink gives its OTLP exporters the budget as their request timeout. When `OTEL_EXPORTER_OTLP_TIMEOUT` (or its `_TRACES_` / `_METRICS_` form) is set, that timeout applies instead, and a request still in flight can hold the process open until the exporters' timeouts expire. The exit flush is new: before it a script ended at once and delivered nothing it still held, and with a collector that cannot be reached it now ends up to the flush budget (3 s by default) after its last call. Set `NEUROLINK_TELEMETRY_EXIT_FLUSH=false` (also `0`, `off` or `no`) to skip it and end as soon as there is no work.

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

The proxy records the pool account label (not an email address), sets `userId` and `sessionId` from `x-neurolink-user-id` and `x-neurolink-session-id` (the session falls back to Claude Code's `x-claude-code-session-id`), names traces `proxy:<model>`, and records usage, cost and time to first token. The `proxy.request` root also carries `neurolink.user_id`, `neurolink.session_id` and `neurolink.conversation_id` as plain attributes for backends that index identity by key.

Request and response bodies are recorded on traces only when `NEUROLINK_PROXY_TRACE_BODY_LOGGING=true`, the same opt-in as before the Langfuse migration. With it on, the bodies become the input and output of the proxy observations, so `mask` and `redactIO` apply to them on the Langfuse request, and `NEUROLINK_RECORD_INPUTS=false` still drops the request body. The raw bodies are also attached as span events only when the same flag is on (`proxy.client.request_body`, `proxy.upstream.request_body`, `proxy.upstream.response_body` and `proxy.stream.events`); without it those events carry only sizes and counts. `mask` and `redactIO` do not cover those events, neither the `proxy.body` attribute nor `proxy.stream.events`, so leave the flag off for traffic whose content must not leave the process.

Upstream error text is recorded without the flag, as it was before the migration: `error.message` and the status message (`<error type>: <text>`) hold the upstream text, capped, as received. `mask` and `redactIO` leave it as it was recorded, as they did before the migration. A translated request, which the proxy serves through a NeuroLink model call, follows the body opt-in: without the flag that call's records keep model, usage, cost, finish reason and timings but no input or output. The `proxy.client.request_headers`, `proxy.upstream.request_headers` and `proxy.upstream.response_headers` events record every header name and, as before, every value as received, except the values of credential headers, which read `[REDACTED]`: `authorization`, `proxy-authorization`, `x-api-key`, `cookie`, `set-cookie`, and names containing `token`, `secret`, `key`, `password` or `credential`, exactly as before.

Proxy spans carry both the `gen_ai.request.model`, `gen_ai.response.model` and `gen_ai.usage.*` names used before the migration and the `proxy.request.model`, `proxy.response.model` and `proxy.usage.*` names. The Langfuse export still produces one priced generation per proxied request. See the [Telemetry Guide](../telemetry-guide.md#-proxy-telemetry-otlp-triple-signal-export) and [Claude Proxy Observability](./claude-proxy-observability.md).

## Voice (LiveKit)

Pipeline mode traces through `stream()` and carries the `voice` tag. Realtime mode records one trace per conversation turn, with transcripts as input and output and tool calls as `tool` records. Every realtime turn is traced when tracing is on, with or without voice memory: a call without memory is traced through `setUpRealtimeCallTracing`, with the room name as the session and no user id. Each turn is traced as soon as it closes, never behind the memory store's writes, so a slow or stuck store loses no trace. At shutdown the call closes its open turn and delivers its traces while its pending turn writes finish, both within `memory.flushBudgetMs` (default 800 ms, because the worker is reaped about a second after shutdown starts); `flushOpenTelemetry()` itself is bounded by `observability.langfuse.flushBudgetMs` (default 3000 ms). The `realtime` generation record carries the model id and the provider of the realtime backend (`vertex` for Gemini Live, `xai` for Grok Voice). Full transcripts are sent to Langfuse by default; use `mask` for sensitive data.

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

| Removed or changed                                                                                     | Replacement                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `langfuse.enabled`                                                                                     | Kept, and optional: Langfuse is on when keys are present unless `enabled: false` (or `langfuse: false`); `enabled: true` is no longer needed                                                                                                                                                                                                                                                                                 |
| `langfuse.userId`, `langfuse.sessionId`                                                                | Per-call `context.userId`, `context.sessionId`, or `setLangfuseContext`                                                                                                                                                                                                                                                                                                                                                      |
| `useExternalTracerProvider`, `autoDetectExternalProvider`                                              | Automatic: a registered global provider is detected                                                                                                                                                                                                                                                                                                                                                                          |
| `skipLangfuseSpanProcessor`                                                                            | Register your own provider; NeuroLink then adds nothing                                                                                                                                                                                                                                                                                                                                                                      |
| `openTelemetry` option (`OpenTelemetryConfig`: `enabled`, `endpoint`, `serviceName`, `serviceVersion`) | `OTEL_EXPORTER_OTLP_ENDPOINT` turns the OTLP trace and metric export on while NeuroLink owns the tracer provider, `OTEL_SERVICE_NAME` names the service (default `ai-service`), and `service.version` is the release: config `release`, `LANGFUSE_RELEASE`, `PUBLIC_APP_VERSION`, then `npm_package_version`, then `v1.0.0` (`deployment.environment` is the configured environment and is not sent when none is configured) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` beside a host `TracerProvider`                                           | Ignored, with one warning. With a host provider (`useExternalTracerProvider`, `autoDetectExternalProvider`) the previous version still exported OTLP metrics and logs to it; that is not restored. Add an OTLP exporter to your own providers                                                                                                                                                                                |
| `autoDetectOperationName`, `operationName`, `traceNameFormat`                                          | `context.traceName`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `customAttributes`                                                                                     | `context.metadata`                                                                                                                                                                                                                                                                                                                                                                                                           |
| `conversationId`, `requestId` on the config                                                            | `context.conversationId`, `context.requestId` (stored as metadata)                                                                                                                                                                                                                                                                                                                                                           |
| `NEUROLINK_TELEMETRY_ENABLED`                                                                          | Still read: `true` records the [metrics](#metrics); it does not turn tracing on                                                                                                                                                                                                                                                                                                                                              |
| `LANGFUSE_ENABLED`                                                                                     | Still read, now only as an off switch: `false`, `0`, `off` or `no` keeps Langfuse off while the keys are in the environment, unless config passed in code turns it on itself (`langfuse: true`, `enabled: true`, or both keys in the options). The keys alone enable tracing, so `LANGFUSE_ENABLED=true` is no longer needed                                                                                                 |
| `LANGFUSE_ENVIRONMENT`, `PUBLIC_APP_ENVIRONMENT`                                                       | Still read, as fallbacks after `LANGFUSE_TRACING_ENVIRONMENT`, for the OTLP resource only                                                                                                                                                                                                                                                                                                                                    |
| `PUBLIC_APP_VERSION`                                                                                   | Still read, as a fallback after `LANGFUSE_RELEASE`, for the OTLP resource only                                                                                                                                                                                                                                                                                                                                               |
| `OTEL_SERVICE_VERSION`                                                                                 | Not read; `service.version` is the release, as above                                                                                                                                                                                                                                                                                                                                                                         |
| `LANGFUSE_BASEURL` hint                                                                                | `LANGFUSE_BASE_URL`                                                                                                                                                                                                                                                                                                                                                                                                          |

### Exports

| Removed or changed                                                                                                                       | Replacement                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `initializeOpenTelemetry`                                                                                                                | Automatic; see [Initialisation](#initialisation)                                                                                                                                                                                     |
| `getLangfuseSpanProcessor`                                                                                                               | `createExporterSpanProcessor(registry)` or `new LangfuseSpanProcessor()`                                                                                                                                                             |
| `getTracerProvider`, `getTracer`                                                                                                         | `trace.getTracer()` from `@opentelemetry/api`                                                                                                                                                                                        |
| `getSpanProcessors`                                                                                                                      | Add `createExporterSpanProcessor()` to your provider                                                                                                                                                                                 |
| `createContextEnricher`                                                                                                                  | `setLangfuseContext` or per-call `context`                                                                                                                                                                                           |
| `isUsingExternalTracerProvider`                                                                                                          | `getLangfuseHealthStatus().usingExternalProvider`                                                                                                                                                                                    |
| `isLangfuseInternalSpan`, `langfuseShouldExportSpan`                                                                                     | Removed; only observation spans are exported                                                                                                                                                                                         |
| `getLangfuseContext`                                                                                                                     | Removed                                                                                                                                                                                                                              |
| `runWithCurrentLangfuseContext`                                                                                                          | `context.bind(context.active(), fn)` from `@opentelemetry/api`                                                                                                                                                                       |
| `buildObservabilityConfigFromEnv`                                                                                                        | Removed; env keys are read automatically                                                                                                                                                                                             |
| `createMockLangfuseClient`                                                                                                               | No longer exported from the package root; still exported by the evaluation hooks module                                                                                                                                              |
| `TelemetryService`                                                                                                                       | Removed. Its metrics are recorded again under the same names without it (see [Metrics](#metrics)), the TTS failures as `custom_tts_failures` and `custom_tts_failure_latency_ms_histogram`; its recording methods are not public API |
| `initializeTelemetry`, `getTelemetryStatus` (root)                                                                                       | Removed; use `getLangfuseHealthStatus`                                                                                                                                                                                               |
| `setLangfuseContext(context, callback?)`: async, with an ambient form and `operationName`, `autoDetectOperationName`, `customAttributes` | `setLangfuseContext(params, fn)` is synchronous and `fn` is required, so wrap the code that should carry the context; use `context.traceName` and `context.metadata` for the options                                                 |
| `getLangfuseHealthStatus()` fields `enabled`, `credentialsValid`, `config`                                                               | `isHealthy`, `hasProcessor`, `usingExternalProvider`; the host and environment are in `neurolink.getTelemetryStatus().langfuse`                                                                                                      |
| `neurolink.getTelemetryStatus().exporters`                                                                                               | Still returned: one `ExporterStatus` per exporter on the shared registry (`ExporterRegistry.getStatuses()`), beside `langfuse` and `openTelemetry`                                                                                   |
| `ToolExecutionGuards.withToolSpan`                                                                                                       | Removed; tool calls are observed by NeuroLink's own tool execution, with no per-provider wrapper                                                                                                                                     |

### CLI

| Removed                              | Replacement                            |
| ------------------------------------ | -------------------------------------- |
| `neurolink telemetry configure`      | Set `LANGFUSE_*` environment variables |
| `neurolink telemetry list-exporters` | `neurolink telemetry status`           |
| `neurolink observability exporters`  | `neurolink observability status`       |

### Types

| Removed or changed                                                                                                   | Replacement                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LangfuseContext`, `TraceNameFormat`                                                                                 | `NeurolinkTraceContext` (per-call `context`, `setLangfuseContext`); the trace name is `context.traceName`                                                                                 |
| `LangfuseConfig`                                                                                                     | `NeurolinkLangfuseConfig`                                                                                                                                                                 |
| `ExporterName`, `ToolSpanCall`, `TelemetryConfigureArgs`, `TelemetryListExportersArgs`, `ObservabilityExportersArgs` | Removed with the CLI commands and tool wrapper that used them                                                                                                                             |
| `AnthropicLoopAdapterConfig`, `GeminiLoopAdapterCoreConfig`, `NativeGenerateLoopArgs`: `provider`                    | `provider` is now a required string, recorded on each step's generation and used to price it; `GeminiLoopAdapterCoreConfig.buildRequest` returns `GeminiStepRequest` instead of `unknown` |

### Dependencies

- `@opentelemetry/sdk-trace-node` moved from a peer dependency to a dependency, so NeuroLink installs it itself.
- `@langfuse/otel` moved from an optional dependency to a devDependency of NeuroLink, so install it yourself for `new LangfuseSpanProcessor()`.
- `@langfuse/core` and `@langfuse/tracing` are new dependencies.

### Unchanged

`ExporterRegistry`, `NoOpExporter`, `AlwaysSampler`, `NeverSampler`, the vendor exporter classes, `ExtendedObservabilityConfig` and the `*ExporterConfig` types are unchanged (`LangfuseExporterConfig` configures `new LangfuseExporter(...)`). NeuroLink wires only `LangfuseExporter`. `LangfuseExporter`, `ExporterSpanProcessor` and `createExporterSpanProcessor` are new root exports.

## See Also

- [Telemetry Guide](../telemetry-guide.md)
- [Claude Proxy Observability](./claude-proxy-observability.md)
- [Analytics Reference](../reference/analytics.md)
