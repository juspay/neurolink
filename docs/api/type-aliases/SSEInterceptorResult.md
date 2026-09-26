[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEInterceptorResult

# Type Alias: SSEInterceptorResult

> **SSEInterceptorResult** = `object`

Defined in: [types/proxy.ts:3088](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3088)

Result of createSSEInterceptor: the pass-through stream and a telemetry promise.

## Properties

### stream

> **stream**: `TransformStream`\<`Uint8Array`, `Uint8Array`\>

Defined in: [types/proxy.ts:3089](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3089)

---

### telemetry

> **telemetry**: `Promise`\<[`SSETelemetry`](SSETelemetry.md)\>

Defined in: [types/proxy.ts:3090](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3090)
