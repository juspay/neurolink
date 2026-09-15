[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestLogSinkSnapshot

# Type Alias: ProxyRequestLogSinkSnapshot

> **ProxyRequestLogSinkSnapshot** = `object`

Defined in: [types/proxy.ts:748](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L748)

File-sink evidence is independent of model/request success counters.

## Properties

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:749](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L749)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:750](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L750)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:751](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L751)

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:752](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L752)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:754](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L754)

Records not admitted because the bounded writer queue was full.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:755](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L755)

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:756](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L756)

---

### lastErrorCode?

> `optional` **lastErrorCode?**: `string`

Defined in: [types/proxy.ts:757](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L757)
