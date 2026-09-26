[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestLogSinkSnapshot

# Type Alias: ProxyRequestLogSinkSnapshot

> **ProxyRequestLogSinkSnapshot** = `object`

File-sink evidence is independent of model/request success counters.

## Properties

### attempted

> **attempted**: `number`

---

### written

> **written**: `number`

---

### inFlight

> **inFlight**: `number`

---

### pending

> **pending**: `number`

---

### dropped

> **dropped**: `number`

Records not admitted because the bounded writer queue was full.

---

### writeTimeouts

> **writeTimeouts**: `number`

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

---

### lastErrorCode?

> `optional` **lastErrorCode?**: `string`
