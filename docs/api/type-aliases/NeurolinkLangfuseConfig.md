[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeurolinkLangfuseConfig

# Type Alias: NeurolinkLangfuseConfig

> **NeurolinkLangfuseConfig** = `object`

## Description

Langfuse exporter options. Every field falls back to its `LANGFUSE_*` environment variable when omitted.

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

`false` keeps Langfuse export off although keys are present; any other value, or leaving it out, leaves it on.

---

### publicKey?

> `optional` **publicKey?**: `string`

Project public key; defaults to `LANGFUSE_PUBLIC_KEY`.

---

### secretKey?

> `optional` **secretKey?**: `string`

Project secret key; defaults to `LANGFUSE_SECRET_KEY`.

---

### baseUrl?

> `optional` **baseUrl?**: `string`

Langfuse host; defaults to `LANGFUSE_BASE_URL`, then Langfuse Cloud.

---

### environment?

> `optional` **environment?**: `string`

Environment name on Langfuse traces; defaults to `LANGFUSE_TRACING_ENVIRONMENT`. The OTLP resource's `deployment.environment` also falls back to `LANGFUSE_ENVIRONMENT`, then `PUBLIC_APP_ENVIRONMENT`.

---

### release?

> `optional` **release?**: `string`

Release identifier on Langfuse traces; defaults to `LANGFUSE_RELEASE`. The OTLP resource's `service.version` also falls back to `PUBLIC_APP_VERSION`.

---

### mask?

> `optional` **mask?**: (`params`) => [`JsonValue`](JsonValue.md)

Applied to input, output and metadata before they are sent to Langfuse. It does not reach other exporters, the OTLP export, `getSpans()` or error text.

#### Parameters

##### params

###### data

[`JsonValue`](JsonValue.md)

#### Returns

[`JsonValue`](JsonValue.md)

---

### redactIO?

> `optional` **redactIO?**: `boolean`

Leaves input and output out of what is sent to Langfuse. It does not reach other exporters, the OTLP export, `getSpans()` or error text.

---

### flushBudgetMs?

> `optional` **flushBudgetMs?**: `number`

Milliseconds a flush or shutdown waits for the Langfuse exporter before it drops what is still in flight; defaults to 3000.

---

### exportMode?

> `optional` **exportMode?**: `"batched"` \| `"immediate"`

`"immediate"` sends every span as it ends; `"batched"` (default) queues them.

---

### flushAt?

> `optional` **flushAt?**: `number`

Spans queued before a batch is sent; defaults to 15.

---

### flushInterval?

> `optional` **flushInterval?**: `number`

Seconds between batch sends; defaults to 5.
