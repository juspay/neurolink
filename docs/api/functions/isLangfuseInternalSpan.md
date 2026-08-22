[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / isLangfuseInternalSpan

# Function: isLangfuseInternalSpan()

> **isLangfuseInternalSpan**(`span`): `boolean`

Defined in: [services/server/ai/observability/instrumentation.ts:757](https://github.com/juspay/neurolink/blob/release/src/lib/services/server/ai/observability/instrumentation.ts#L757)

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
