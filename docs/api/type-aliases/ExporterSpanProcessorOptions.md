[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExporterSpanProcessorOptions

# Type Alias: ExporterSpanProcessorOptions

> **ExporterSpanProcessorOptions** = `object`

## Description

How `createExporterSpanProcessor` treats the exporters of its registry.

## Properties

### shutdownExporters?

> `optional` **shutdownExporters?**: `boolean`

Whether the processor's `shutdown()` also shuts down the registry's exporters. Defaults to `true`; `false` flushes them and leaves them running.
