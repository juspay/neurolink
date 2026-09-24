[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestLogSinkSnapshot

# Type Alias: ProxyRequestLogSinkSnapshot

> **ProxyRequestLogSinkSnapshot** = `object`

Defined in: [types/proxy.ts:875](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L875)

File-sink evidence is independent of model/request success counters.

## Properties

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:876](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L876)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:877](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L877)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:878](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L878)

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:879](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L879)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:881](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L881)

Records not admitted because the bounded writer queue was full.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:882](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L882)

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L883)

---

### lastErrorCode?

> `optional` **lastErrorCode?**: `string`

Defined in: [types/proxy.ts:884](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L884)
