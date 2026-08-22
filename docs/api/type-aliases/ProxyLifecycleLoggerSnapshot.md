[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerSnapshot

# Type Alias: ProxyLifecycleLoggerSnapshot

> **ProxyLifecycleLoggerSnapshot** = `object`

Defined in: [types/proxy.ts:1809](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1809)

Data-quality counters for the bounded lifecycle metadata sink.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1810](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1810)

---

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/proxy.ts:1811](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1811)

---

### processInstanceId

> **processInstanceId**: `string`

Defined in: [types/proxy.ts:1812](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1812)

---

### nextSequence

> **nextSequence**: `number`

Defined in: [types/proxy.ts:1813](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1813)

---

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:1814](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1814)

---

### enqueued

> **enqueued**: `number`

Defined in: [types/proxy.ts:1815](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1815)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:1816](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1816)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:1817](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1817)

---

### queueDrops

> **queueDrops**: `number`

Defined in: [types/proxy.ts:1818](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1818)

---

### invalidDrops

> **invalidDrops**: `number`

Defined in: [types/proxy.ts:1819](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1819)

---

### writeDrops

> **writeDrops**: `number`

Defined in: [types/proxy.ts:1820](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1820)

---

### writeFailures

> **writeFailures**: `number`

Defined in: [types/proxy.ts:1821](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1821)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:1823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1823)

Events requeued after a transient lifecycle metadata write failure.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:1824](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1824)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:1825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1825)

---

### flushing

> **flushing**: `boolean`

Defined in: [types/proxy.ts:1826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1826)
