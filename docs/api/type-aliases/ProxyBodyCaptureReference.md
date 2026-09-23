[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureReference

# Type Alias: ProxyBodyCaptureReference

> **ProxyBodyCaptureReference** = `object`

Defined in: [types/proxy.ts:894](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L894)

One-hop reference to identical redacted bytes from the same request.

## Properties

### captureId

> **captureId**: `string`

Defined in: [types/proxy.ts:895](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L895)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:896](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L896)

---

### bodySha256

> **bodySha256**: `string`

Defined in: [types/proxy.ts:897](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L897)

---

### redactedBodyBytes

> **redactedBodyBytes**: `number`

Defined in: [types/proxy.ts:898](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L898)

---

### exportedAt

> **exportedAt**: `string`

Defined in: [types/proxy.ts:900](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L900)

Source export settlement time, used to bound backend reconstruction.
