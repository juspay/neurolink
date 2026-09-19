[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureAdmission

# Type Alias: ProxyBodyCaptureAdmission

> **ProxyBodyCaptureAdmission** = `object`

Defined in: [types/proxy.ts:812](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L812)

Exact bounded-admission state; records no request content.

## Properties

### limitingResource

> **limitingResource**: `"entry"` \| `"captures"` \| `"bytes"` \| `"worker"`

Defined in: [types/proxy.ts:813](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L813)

---

### estimatedBytes?

> `optional` **estimatedBytes?**: `number`

Defined in: [types/proxy.ts:814](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L814)

---

### maxEntryBytes?

> `optional` **maxEntryBytes?**: `number`

Defined in: [types/proxy.ts:816](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L816)

Per-entry clone ceiling, independent of the aggregate queue ceiling.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:817](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L817)

---

### pendingBytes

> **pendingBytes**: `number`

Defined in: [types/proxy.ts:818](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L818)

---

### maxPending

> **maxPending**: `number`

Defined in: [types/proxy.ts:819](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L819)

---

### maxPendingBytes

> **maxPendingBytes**: `number`

Defined in: [types/proxy.ts:820](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L820)
