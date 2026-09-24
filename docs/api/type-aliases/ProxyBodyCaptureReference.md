[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureReference

# Type Alias: ProxyBodyCaptureReference

> **ProxyBodyCaptureReference** = `object`

Defined in: [types/proxy.ts:955](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L955)

One-hop reference to identical redacted bytes from the same request.

## Properties

### captureId

> **captureId**: `string`

Defined in: [types/proxy.ts:956](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L956)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:957](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L957)

---

### bodySha256

> **bodySha256**: `string`

Defined in: [types/proxy.ts:958](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L958)

---

### redactedBodyBytes

> **redactedBodyBytes**: `number`

Defined in: [types/proxy.ts:959](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L959)

---

### exportedAt

> **exportedAt**: `string`

Defined in: [types/proxy.ts:961](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L961)

Source export settlement time, used to bound backend reconstruction.
