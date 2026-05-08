[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / getTracer

# Function: getTracer()

> **getTracer**(`name?`, `version?`): `Tracer`

Defined in: [services/server/ai/observability/instrumentation.ts:1510](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/services/server/ai/observability/instrumentation.ts#L1510)

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
