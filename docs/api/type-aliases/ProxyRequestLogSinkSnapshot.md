[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestLogSinkSnapshot

# Type Alias: ProxyRequestLogSinkSnapshot

> **ProxyRequestLogSinkSnapshot** = `object`

Defined in: [types/proxy.ts:755](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L755)

File-sink evidence is independent of model/request success counters.

## Properties

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:756](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L756)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:757](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L757)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:758](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L758)

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:759](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L759)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:761](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L761)

Records not admitted because the bounded writer queue was full.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:762](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L762)

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:763](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L763)

---

### lastErrorCode?

> `optional` **lastErrorCode?**: `string`

Defined in: [types/proxy.ts:764](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L764)
