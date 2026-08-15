[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / getTracer

# Function: getTracer()

> **getTracer**(`name?`, `version?`): `Tracer`

Defined in: [services/server/ai/observability/instrumentation.ts:1545](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/services/server/ai/observability/instrumentation.ts#L1545)

Get an OpenTelemetry Tracer for creating custom spans

This allows applications to create their own spans that will be
processed by the same span processors (ContextEnricher + LangfuseSpanProcessor).

## Parameters

### name?

`string` = `"neurolink"`

Tracer name, defaults to "neurolink"

### version?

`string`

Tracer version, optional

## Returns

`Tracer`

OpenTelemetry Tracer instance

## Example

```ts
const tracer = getTracer("my-app");
const span = tracer.startSpan("custom-operation");
try {
  // ... do work
} finally {
  span.end();
}
```
