[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyPublicationProgress

# Type Alias: ProxyBodyPublicationProgress

> **ProxyBodyPublicationProgress** = `object`

One bounded body publication, tracked across exporter callbacks.

## Properties

### acknowledged

> **acknowledged**: `number`

---

### unconfirmed

> **unconfirmed**: `number`

---

### dropped

> **dropped**: `number`

---

### emitted

> **emitted**: `number`

---

### maxChunkQueueWaitMs?

> `optional` **maxChunkQueueWaitMs?**: `number`

---

### maxChunkExportMs?

> `optional` **maxChunkExportMs?**: `number`

---

### notify?

> `optional` **notify?**: () => `void`

#### Returns

`void`
