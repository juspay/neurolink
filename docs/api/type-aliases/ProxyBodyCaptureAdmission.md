[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureAdmission

# Type Alias: ProxyBodyCaptureAdmission

> **ProxyBodyCaptureAdmission** = `object`

Defined in: [types/proxy.ts:818](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L818)

Exact bounded-admission state; records no request content.

## Properties

### limitingResource

> **limitingResource**: `"entry"` \| `"captures"` \| `"bytes"` \| `"worker"`

Defined in: [types/proxy.ts:819](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L819)

---

### estimatedBytes?

> `optional` **estimatedBytes?**: `number`

Defined in: [types/proxy.ts:820](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L820)

---

### maxEntryBytes?

> `optional` **maxEntryBytes?**: `number`

Defined in: [types/proxy.ts:822](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L822)

Per-entry clone ceiling, independent of the aggregate queue ceiling.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L823)

---

### pendingBytes

> **pendingBytes**: `number`

Defined in: [types/proxy.ts:824](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L824)

---

### maxPending

> **maxPending**: `number`

Defined in: [types/proxy.ts:825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L825)

---

### maxPendingBytes

> **maxPendingBytes**: `number`

Defined in: [types/proxy.ts:826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L826)
