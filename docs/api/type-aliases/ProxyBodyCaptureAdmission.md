[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureAdmission

# Type Alias: ProxyBodyCaptureAdmission

> **ProxyBodyCaptureAdmission** = `object`

Defined in: [types/proxy.ts:890](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L890)

Exact bounded-admission state; records no request content.

## Properties

### limitingResource

> **limitingResource**: `"entry"` \| `"captures"` \| `"bytes"` \| `"worker"`

Defined in: [types/proxy.ts:891](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L891)

---

### estimatedBytes?

> `optional` **estimatedBytes?**: `number`

Defined in: [types/proxy.ts:892](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L892)

---

### maxEntryBytes?

> `optional` **maxEntryBytes?**: `number`

Defined in: [types/proxy.ts:894](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L894)

Per-entry clone ceiling, independent of the aggregate queue ceiling.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:895](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L895)

---

### pendingBytes

> **pendingBytes**: `number`

Defined in: [types/proxy.ts:896](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L896)

---

### maxPending

> **maxPending**: `number`

Defined in: [types/proxy.ts:897](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L897)

---

### maxPendingBytes

> **maxPendingBytes**: `number`

Defined in: [types/proxy.ts:898](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L898)
