[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createExporterSpanProcessor

# Function: createExporterSpanProcessor()

> **createExporterSpanProcessor**(`registry?`, `options?`): [`ExporterSpanProcessor`](../classes/ExporterSpanProcessor.md)

## Parameters

### registry?

[`ExporterRegistry`](../classes/ExporterRegistry.md) = `...`

{ExporterRegistry} - Registry to export to; defaults to the process-wide registry.

### options?

[`ExporterSpanProcessorOptions`](../type-aliases/ExporterSpanProcessorOptions.md) = `{}`

{ExporterSpanProcessorOptions} - `shutdownExporters` (default `true`) says whether the processor's `shutdown()` also shuts down the registry's exporters.

## Returns

[`ExporterSpanProcessor`](../classes/ExporterSpanProcessor.md)

A processor ready to be added to a TracerProvider.

## Description

Creates a span processor that feeds NeuroLink's observation spans to an exporter registry. Add it to a host `TracerProvider` to deliver spans through the registered exporters (such as `LangfuseExporter`) instead of `LangfuseSpanProcessor`. Shutting that provider down shuts the registry's exporters down; pass `{ shutdownExporters: false }` to flush them and leave them running, so a provider the host rebuilds keeps exporting.

## Examples

```ts
const provider = new NodeTracerProvider({
  spanProcessors: [createExporterSpanProcessor()],
});
```

```ts
// A host provider that is shut down and rebuilt over the same exporters
const processor = createExporterSpanProcessor(getExporterRegistry(), {
  shutdownExporters: false,
});
```
