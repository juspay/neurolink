[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureAdmission

# Type Alias: ProxyBodyCaptureAdmission

> **ProxyBodyCaptureAdmission** = `object`

Defined in: [types/proxy.ts:899](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L899)

Exact bounded-admission state; records no request content.

## Properties

### limitingResource

> **limitingResource**: `"entry"` \| `"captures"` \| `"bytes"` \| `"worker"`

Defined in: [types/proxy.ts:900](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L900)

---

### estimatedBytes?

> `optional` **estimatedBytes?**: `number`

Defined in: [types/proxy.ts:901](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L901)

---

### maxEntryBytes?

> `optional` **maxEntryBytes?**: `number`

Defined in: [types/proxy.ts:903](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L903)

Per-entry clone ceiling, independent of the aggregate queue ceiling.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:904](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L904)

---

### pendingBytes

> **pendingBytes**: `number`

Defined in: [types/proxy.ts:905](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L905)

---

### maxPending

> **maxPending**: `number`

Defined in: [types/proxy.ts:906](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L906)

---

### maxPendingBytes

> **maxPendingBytes**: `number`

Defined in: [types/proxy.ts:907](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L907)
