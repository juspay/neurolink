[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SentryExporterConfig

# Type Alias: SentryExporterConfig

> **SentryExporterConfig** = [`ExporterConfig`](ExporterConfig.md) & `object`

Defined in: [types/exporter.ts:113](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/exporter.ts#L113)

Sentry exporter configuration

## Type Declaration

### dsn

> **dsn**: `string`

#### Sensitive

WARNING: This is a sensitive credential. Handle securely.

### tracesSampleRate?

> `optional` **tracesSampleRate?**: `number`

### profilesSampleRate?

> `optional` **profilesSampleRate?**: `number`

### release?

> `optional` **release?**: `string`
