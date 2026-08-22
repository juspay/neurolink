[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / OtelExporterConfig

# Type Alias: OtelExporterConfig

> **OtelExporterConfig** = [`ExporterConfig`](ExporterConfig.md) & `object`

Defined in: [types/exporter.ts:189](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/exporter.ts#L189)

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
