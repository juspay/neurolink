[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfuseExporterConfig

# Type Alias: LangfuseExporterConfig

> **LangfuseExporterConfig** = [`ExporterConfig`](ExporterConfig.md) & `object`

Defined in: [types/exporter.ts:63](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/exporter.ts#L63)

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
