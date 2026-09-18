[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureAdmission

# Type Alias: ProxyBodyCaptureAdmission

> **ProxyBodyCaptureAdmission** = `object`

Defined in: [types/proxy.ts:776](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L776)

Exact bounded-admission state; records no request content.

## Properties

### limitingResource

> **limitingResource**: `"entry"` \| `"captures"` \| `"bytes"` \| `"worker"`

Defined in: [types/proxy.ts:777](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L777)

---

### estimatedBytes?

> `optional` **estimatedBytes?**: `number`

Defined in: [types/proxy.ts:778](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L778)

---

### maxEntryBytes?

> `optional` **maxEntryBytes?**: `number`

Defined in: [types/proxy.ts:780](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L780)

Per-entry clone ceiling, independent of the aggregate queue ceiling.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:781](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L781)

---

### pendingBytes

> **pendingBytes**: `number`

Defined in: [types/proxy.ts:782](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L782)

---

### maxPending

> **maxPending**: `number`

Defined in: [types/proxy.ts:783](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L783)

---

### maxPendingBytes

> **maxPendingBytes**: `number`

Defined in: [types/proxy.ts:784](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L784)
