[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyPublicationProgress

# Type Alias: ProxyBodyPublicationProgress

> **ProxyBodyPublicationProgress** = `object`

Defined in: [types/proxy.ts:990](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L990)

One bounded body publication, tracked across exporter callbacks.

## Properties

### acknowledged

> **acknowledged**: `number`

Defined in: [types/proxy.ts:991](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L991)

---

### unconfirmed

> **unconfirmed**: `number`

Defined in: [types/proxy.ts:992](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L992)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:993](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L993)

---

### emitted

> **emitted**: `number`

Defined in: [types/proxy.ts:994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L994)

---

### maxChunkQueueWaitMs?

> `optional` **maxChunkQueueWaitMs?**: `number`

Defined in: [types/proxy.ts:995](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L995)

---

### maxChunkExportMs?

> `optional` **maxChunkExportMs?**: `number`

Defined in: [types/proxy.ts:996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L996)

---

### notify?

> `optional` **notify?**: () => `void`

Defined in: [types/proxy.ts:997](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L997)

#### Returns

`void`
