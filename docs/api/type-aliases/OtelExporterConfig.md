[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OtelExporterConfig

# Type Alias: OtelExporterConfig

> **OtelExporterConfig** = [`ExporterConfig`](ExporterConfig.md) & `object`

Defined in: [types/exporter.ts:189](https://github.com/juspay/neurolink/blob/release/src/lib/types/exporter.ts#L189)

OpenTelemetry exporter configuration

## Type Declaration

### endpoint

> **endpoint**: `string`

### protocol?

> `optional` **protocol?**: [`OtelProtocol`](OtelProtocol.md)

### serviceName?

> `optional` **serviceName?**: `string`

### serviceVersion?

> `optional` **serviceVersion?**: `string`

### resourceAttributes?

> `optional` **resourceAttributes?**: `Record`\<`string`, `string`\>

### compression?

> `optional` **compression?**: `"gzip"` \| `"none"`
