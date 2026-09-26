[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEInterceptorResult

# Type Alias: SSEInterceptorResult

> **SSEInterceptorResult** = `object`

Defined in: [types/proxy.ts:3148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3148)

Result of createSSEInterceptor: the pass-through stream and a telemetry promise.

## Properties

### stream

> **stream**: `TransformStream`\<`Uint8Array`, `Uint8Array`\>

Defined in: [types/proxy.ts:3149](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3149)

---

### telemetry

> **telemetry**: `Promise`\<[`SSETelemetry`](SSETelemetry.md)\>

Defined in: [types/proxy.ts:3150](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3150)
