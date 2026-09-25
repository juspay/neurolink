[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestLogSinkSnapshot

# Type Alias: ProxyRequestLogSinkSnapshot

> **ProxyRequestLogSinkSnapshot** = `object`

Defined in: [types/proxy.ts:866](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L866)

File-sink evidence is independent of model/request success counters.

## Properties

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:867](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L867)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:868](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L868)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:869](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L869)

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:870](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L870)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:872](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L872)

Records not admitted because the bounded writer queue was full.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L873)

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:874](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L874)

---

### lastErrorCode?

> `optional` **lastErrorCode?**: `string`

Defined in: [types/proxy.ts:875](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L875)
