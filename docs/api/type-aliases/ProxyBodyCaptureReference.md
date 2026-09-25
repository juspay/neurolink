[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureReference

# Type Alias: ProxyBodyCaptureReference

> **ProxyBodyCaptureReference** = `object`

Defined in: [types/proxy.ts:946](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L946)

One-hop reference to identical redacted bytes from the same request.

## Properties

### captureId

> **captureId**: `string`

Defined in: [types/proxy.ts:947](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L947)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:948](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L948)

---

### bodySha256

> **bodySha256**: `string`

Defined in: [types/proxy.ts:949](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L949)

---

### redactedBodyBytes

> **redactedBodyBytes**: `number`

Defined in: [types/proxy.ts:950](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L950)

---

### exportedAt

> **exportedAt**: `string`

Defined in: [types/proxy.ts:952](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L952)

Source export settlement time, used to bound backend reconstruction.
