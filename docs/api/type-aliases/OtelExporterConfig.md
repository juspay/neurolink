[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OtelExporterConfig

# Type Alias: OtelExporterConfig

> **OtelExporterConfig** = [`ExporterConfig`](ExporterConfig.md) & `object`

Defined in: [types/exporter.ts:189](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/exporter.ts#L189)

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
