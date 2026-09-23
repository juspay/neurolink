[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureReference

# Type Alias: ProxyBodyCaptureReference

> **ProxyBodyCaptureReference** = `object`

Defined in: [types/proxy.ts:874](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L874)

One-hop reference to identical redacted bytes from the same request.

## Properties

### captureId

> **captureId**: `string`

Defined in: [types/proxy.ts:875](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L875)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:876](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L876)

---

### bodySha256

> **bodySha256**: `string`

Defined in: [types/proxy.ts:877](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L877)

---

### redactedBodyBytes

> **redactedBodyBytes**: `number`

Defined in: [types/proxy.ts:878](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L878)

---

### exportedAt

> **exportedAt**: `string`

Defined in: [types/proxy.ts:880](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L880)

Source export settlement time, used to bound backend reconstruction.
