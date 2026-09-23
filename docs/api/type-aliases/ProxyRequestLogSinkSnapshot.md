[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestLogSinkSnapshot

# Type Alias: ProxyRequestLogSinkSnapshot

> **ProxyRequestLogSinkSnapshot** = `object`

Defined in: [types/proxy.ts:794](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L794)

File-sink evidence is independent of model/request success counters.

## Properties

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:795](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L795)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:796](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L796)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:797](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L797)

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:798](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L798)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:800](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L800)

Records not admitted because the bounded writer queue was full.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:801](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L801)

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:802](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L802)

---

### lastErrorCode?

> `optional` **lastErrorCode?**: `string`

Defined in: [types/proxy.ts:803](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L803)
