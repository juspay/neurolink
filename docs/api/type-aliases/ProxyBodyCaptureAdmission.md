[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureAdmission

# Type Alias: ProxyBodyCaptureAdmission

> **ProxyBodyCaptureAdmission** = `object`

Defined in: [types/proxy.ts:838](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L838)

Exact bounded-admission state; records no request content.

## Properties

### limitingResource

> **limitingResource**: `"entry"` \| `"captures"` \| `"bytes"` \| `"worker"`

Defined in: [types/proxy.ts:839](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L839)

---

### estimatedBytes?

> `optional` **estimatedBytes?**: `number`

Defined in: [types/proxy.ts:840](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L840)

---

### maxEntryBytes?

> `optional` **maxEntryBytes?**: `number`

Defined in: [types/proxy.ts:842](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L842)

Per-entry clone ceiling, independent of the aggregate queue ceiling.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:843](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L843)

---

### pendingBytes

> **pendingBytes**: `number`

Defined in: [types/proxy.ts:844](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L844)

---

### maxPending

> **maxPending**: `number`

Defined in: [types/proxy.ts:845](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L845)

---

### maxPendingBytes

> **maxPendingBytes**: `number`

Defined in: [types/proxy.ts:846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L846)
