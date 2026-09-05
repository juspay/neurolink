[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEInterceptorResult

# Type Alias: SSEInterceptorResult

> **SSEInterceptorResult** = `object`

Defined in: [types/proxy.ts:2490](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2490)

Result of createSSEInterceptor: the pass-through stream and a telemetry promise.

## Properties

### stream

> **stream**: `TransformStream`\<`Uint8Array`, `Uint8Array`\>

Defined in: [types/proxy.ts:2491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2491)

---

### telemetry

> **telemetry**: `Promise`\<[`SSETelemetry`](SSETelemetry.md)\>

Defined in: [types/proxy.ts:2492](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2492)
