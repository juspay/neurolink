[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SentryExporterConfig

# Type Alias: SentryExporterConfig

> **SentryExporterConfig** = [`ExporterConfig`](ExporterConfig.md) & `object`

Defined in: [types/exporter.ts:113](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/exporter.ts#L113)

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
