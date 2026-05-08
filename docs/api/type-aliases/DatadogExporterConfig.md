[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / DatadogExporterConfig

# Type Alias: DatadogExporterConfig

> **DatadogExporterConfig** = [`ExporterConfig`](ExporterConfig.md) & `object`

Defined in: [types/exporter.ts:97](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/exporter.ts#L97)

Datadog exporter configuration

## Type Declaration

### apiKey

> **apiKey**: `string`

#### Sensitive

WARNING: This is a sensitive credential. Handle securely.

### appKey?

> `optional` **appKey?**: `string`

### site?

> `optional` **site?**: `string`

Datadog site: us1, us3, us5, eu1, ap1

### service?

> `optional` **service?**: `string`

### source?

> `optional` **source?**: `string`
