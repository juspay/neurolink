[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyPublicationProgress

# Type Alias: ProxyBodyPublicationProgress

> **ProxyBodyPublicationProgress** = `object`

Defined in: [types/proxy.ts:809](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L809)

One bounded body publication, tracked across exporter callbacks.

## Properties

### acknowledged

> **acknowledged**: `number`

Defined in: [types/proxy.ts:810](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L810)

---

### unconfirmed

> **unconfirmed**: `number`

Defined in: [types/proxy.ts:811](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L811)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:812](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L812)

---

### emitted

> **emitted**: `number`

Defined in: [types/proxy.ts:813](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L813)

---

### notify?

> `optional` **notify?**: () => `void`

Defined in: [types/proxy.ts:814](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L814)

#### Returns

`void`
