[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyPublicationProgress

# Type Alias: ProxyBodyPublicationProgress

> **ProxyBodyPublicationProgress** = `object`

Defined in: [types/proxy.ts:820](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L820)

One bounded body publication, tracked across exporter callbacks.

## Properties

### acknowledged

> **acknowledged**: `number`

Defined in: [types/proxy.ts:821](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L821)

---

### unconfirmed

> **unconfirmed**: `number`

Defined in: [types/proxy.ts:822](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L822)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L823)

---

### emitted

> **emitted**: `number`

Defined in: [types/proxy.ts:824](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L824)

---

### notify?

> `optional` **notify?**: () => `void`

Defined in: [types/proxy.ts:825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L825)

#### Returns

`void`
