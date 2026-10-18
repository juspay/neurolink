[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfuseExporterConfig

# Type Alias: LangfuseExporterConfig

> **LangfuseExporterConfig** = [`ExporterConfig`](ExporterConfig.md) & `object`

Langfuse exporter configuration

## Type Declaration

### publicKey

> **publicKey**: `string`

### secretKey

> **secretKey**: `string`

#### Sensitive

WARNING: This is a sensitive credential. Handle securely.

### baseUrl?

> `optional` **baseUrl?**: `string`

### release?

> `optional` **release?**: `string`

### redactIO?

> `optional` **redactIO?**: `boolean`

When true, `input` and `output` fields are omitted from exported spans and
generations. Enable in compliance-sensitive deployments where prompt/response
content is considered PII or subject to data-minimisation requirements.
Defaults to false (input/output are exported). It acts on what this
exporter sends to Langfuse and nowhere else.

### mask?

> `optional` **mask?**: (`params`) => [`JsonValue`](JsonValue.md)

Applied to input, output and metadata before they are sent to Langfuse.
When it throws, the value is replaced by `<fully masked>`. It acts on what
this exporter sends and nowhere else: not on other exporters, the OTLP
export, `getSpans()` or error text.

#### Parameters

##### params

###### data

[`JsonValue`](JsonValue.md)

#### Returns

[`JsonValue`](JsonValue.md)

### flushBudgetMs?

> `optional` **flushBudgetMs?**: `number`

Milliseconds `flush()` and `shutdown()` wait for delivery before they
give up on what is still in flight and drop it. Defaults to 3000.
