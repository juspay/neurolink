[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyPublicationProgress

# Type Alias: ProxyBodyPublicationProgress

> **ProxyBodyPublicationProgress** = `object`

Defined in: [types/proxy.ts:918](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L918)

One bounded body publication, tracked across exporter callbacks.

## Properties

### acknowledged

> **acknowledged**: `number`

Defined in: [types/proxy.ts:919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L919)

---

### unconfirmed

> **unconfirmed**: `number`

Defined in: [types/proxy.ts:920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L920)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:921](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L921)

---

### emitted

> **emitted**: `number`

Defined in: [types/proxy.ts:922](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L922)

---

### maxChunkQueueWaitMs?

> `optional` **maxChunkQueueWaitMs?**: `number`

Defined in: [types/proxy.ts:923](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L923)

---

### maxChunkExportMs?

> `optional` **maxChunkExportMs?**: `number`

Defined in: [types/proxy.ts:924](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L924)

---

### notify?

> `optional` **notify?**: () => `void`

Defined in: [types/proxy.ts:925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L925)

#### Returns

`void`
