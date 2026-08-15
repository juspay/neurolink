[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / OtelExporterConfig

# Type Alias: OtelExporterConfig

> **OtelExporterConfig** = [`ExporterConfig`](ExporterConfig.md) & `object`

Defined in: [types/exporter.ts:189](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/exporter.ts#L189)

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
