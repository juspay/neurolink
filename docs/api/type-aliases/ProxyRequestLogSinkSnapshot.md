[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestLogSinkSnapshot

# Type Alias: ProxyRequestLogSinkSnapshot

> **ProxyRequestLogSinkSnapshot** = `object`

Defined in: [types/proxy.ts:746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L746)

File-sink evidence is independent of model/request success counters.

## Properties

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L747)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:748](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L748)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:749](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L749)

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:750](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L750)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:752](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L752)

Records not admitted because the bounded writer queue was full.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:753](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L753)

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:754](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L754)

---

### lastErrorCode?

> `optional` **lastErrorCode?**: `string`

Defined in: [types/proxy.ts:755](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L755)
