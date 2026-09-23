[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyPublicationProgress

# Type Alias: ProxyBodyPublicationProgress

> **ProxyBodyPublicationProgress** = `object`

Defined in: [types/proxy.ts:938](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L938)

One bounded body publication, tracked across exporter callbacks.

## Properties

### acknowledged

> **acknowledged**: `number`

Defined in: [types/proxy.ts:939](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L939)

---

### unconfirmed

> **unconfirmed**: `number`

Defined in: [types/proxy.ts:940](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L940)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:941](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L941)

---

### emitted

> **emitted**: `number`

Defined in: [types/proxy.ts:942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L942)

---

### maxChunkQueueWaitMs?

> `optional` **maxChunkQueueWaitMs?**: `number`

Defined in: [types/proxy.ts:943](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L943)

---

### maxChunkExportMs?

> `optional` **maxChunkExportMs?**: `number`

Defined in: [types/proxy.ts:944](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L944)

---

### notify?

> `optional` **notify?**: () => `void`

Defined in: [types/proxy.ts:945](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L945)

#### Returns

`void`
