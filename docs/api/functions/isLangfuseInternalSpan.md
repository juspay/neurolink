[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / isLangfuseInternalSpan

# Function: isLangfuseInternalSpan()

> **isLangfuseInternalSpan**(`span`): `boolean`

Defined in: [services/server/ai/observability/instrumentation.ts:766](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/services/server/ai/observability/instrumentation.ts#L766)

True when a span is an internal NeuroLink wrapper that should NOT be sent to
Langfuse. Internal wrappers carry the `langfuse.internal: true` attribute.

Exposed so host apps that bring their own `LangfuseSpanProcessor` (e.g.
`skipLangfuseSpanProcessor: true`, or manual registration on an existing
TracerProvider) can apply the same filter and avoid duplicate observations.

## Parameters

### span

#### attributes?

`Record`\<`string`, `unknown`\>

## Returns

`boolean`
