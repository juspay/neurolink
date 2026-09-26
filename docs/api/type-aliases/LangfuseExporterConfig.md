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
Defaults to false (input/output are exported).
