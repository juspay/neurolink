[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyPublicationProgress

# Type Alias: ProxyBodyPublicationProgress

> **ProxyBodyPublicationProgress** = `object`

Defined in: [types/proxy.ts:868](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L868)

One bounded body publication, tracked across exporter callbacks.

## Properties

### acknowledged

> **acknowledged**: `number`

Defined in: [types/proxy.ts:869](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L869)

---

### unconfirmed

> **unconfirmed**: `number`

Defined in: [types/proxy.ts:870](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L870)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:871](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L871)

---

### emitted

> **emitted**: `number`

Defined in: [types/proxy.ts:872](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L872)

---

### maxChunkQueueWaitMs?

> `optional` **maxChunkQueueWaitMs?**: `number`

Defined in: [types/proxy.ts:873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L873)

---

### maxChunkExportMs?

> `optional` **maxChunkExportMs?**: `number`

Defined in: [types/proxy.ts:874](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L874)

---

### notify?

> `optional` **notify?**: () => `void`

Defined in: [types/proxy.ts:875](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L875)

#### Returns

`void`
