[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestLogSinkSnapshot

# Type Alias: ProxyRequestLogSinkSnapshot

> **ProxyRequestLogSinkSnapshot** = `object`

Defined in: [types/proxy.ts:814](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L814)

File-sink evidence is independent of model/request success counters.

## Properties

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:815](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L815)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:816](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L816)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:817](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L817)

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:818](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L818)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:820](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L820)

Records not admitted because the bounded writer queue was full.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:821](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L821)

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:822](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L822)

---

### lastErrorCode?

> `optional` **lastErrorCode?**: `string`

Defined in: [types/proxy.ts:823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L823)
