[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestLogSinkSnapshot

# Type Alias: ProxyRequestLogSinkSnapshot

> **ProxyRequestLogSinkSnapshot** = `object`

Defined in: [types/proxy.ts:788](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L788)

File-sink evidence is independent of model/request success counters.

## Properties

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:789](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L789)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:790](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L790)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:791](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L791)

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:792](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L792)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:794](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L794)

Records not admitted because the bounded writer queue was full.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:795](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L795)

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:796](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L796)

---

### lastErrorCode?

> `optional` **lastErrorCode?**: `string`

Defined in: [types/proxy.ts:797](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L797)
