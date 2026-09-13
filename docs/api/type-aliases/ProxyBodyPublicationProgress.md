[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyPublicationProgress

# Type Alias: ProxyBodyPublicationProgress

> **ProxyBodyPublicationProgress** = `object`

Defined in: [types/proxy.ts:788](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L788)

One bounded body publication, tracked across exporter callbacks.

## Properties

### acknowledged

> **acknowledged**: `number`

Defined in: [types/proxy.ts:789](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L789)

---

### unconfirmed

> **unconfirmed**: `number`

Defined in: [types/proxy.ts:790](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L790)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:791](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L791)

---

### emitted

> **emitted**: `number`

Defined in: [types/proxy.ts:792](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L792)

---

### notify?

> `optional` **notify?**: () => `void`

Defined in: [types/proxy.ts:793](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L793)

#### Returns

`void`
