[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureAdmission

# Type Alias: ProxyBodyCaptureAdmission

> **ProxyBodyCaptureAdmission** = `object`

Defined in: [types/proxy.ts:769](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L769)

Exact bounded-admission state; records no request content.

## Properties

### limitingResource

> **limitingResource**: `"entry"` \| `"captures"` \| `"bytes"` \| `"worker"`

Defined in: [types/proxy.ts:770](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L770)

---

### estimatedBytes?

> `optional` **estimatedBytes?**: `number`

Defined in: [types/proxy.ts:771](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L771)

---

### maxEntryBytes?

> `optional` **maxEntryBytes?**: `number`

Defined in: [types/proxy.ts:773](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L773)

Per-entry clone ceiling, independent of the aggregate queue ceiling.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:774](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L774)

---

### pendingBytes

> **pendingBytes**: `number`

Defined in: [types/proxy.ts:775](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L775)

---

### maxPending

> **maxPending**: `number`

Defined in: [types/proxy.ts:776](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L776)

---

### maxPendingBytes

> **maxPendingBytes**: `number`

Defined in: [types/proxy.ts:777](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L777)
