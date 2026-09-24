[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyPublicationProgress

# Type Alias: ProxyBodyPublicationProgress

> **ProxyBodyPublicationProgress** = `object`

Defined in: [types/proxy.ts:999](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L999)

One bounded body publication, tracked across exporter callbacks.

## Properties

### acknowledged

> **acknowledged**: `number`

Defined in: [types/proxy.ts:1000](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1000)

---

### unconfirmed

> **unconfirmed**: `number`

Defined in: [types/proxy.ts:1001](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1001)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:1002](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1002)

---

### emitted

> **emitted**: `number`

Defined in: [types/proxy.ts:1003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1003)

---

### maxChunkQueueWaitMs?

> `optional` **maxChunkQueueWaitMs?**: `number`

Defined in: [types/proxy.ts:1004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1004)

---

### maxChunkExportMs?

> `optional` **maxChunkExportMs?**: `number`

Defined in: [types/proxy.ts:1005](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1005)

---

### notify?

> `optional` **notify?**: () => `void`

Defined in: [types/proxy.ts:1006](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1006)

#### Returns

`void`
