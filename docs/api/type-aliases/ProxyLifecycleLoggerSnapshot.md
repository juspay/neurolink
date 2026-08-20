[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerSnapshot

# Type Alias: ProxyLifecycleLoggerSnapshot

> **ProxyLifecycleLoggerSnapshot** = `object`

Defined in: [types/proxy.ts:1815](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1815)

Data-quality counters for the bounded lifecycle metadata sink.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1816](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1816)

---

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/proxy.ts:1817](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1817)

---

### processInstanceId

> **processInstanceId**: `string`

Defined in: [types/proxy.ts:1818](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1818)

---

### nextSequence

> **nextSequence**: `number`

Defined in: [types/proxy.ts:1819](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1819)

---

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:1820](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1820)

---

### enqueued

> **enqueued**: `number`

Defined in: [types/proxy.ts:1821](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1821)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:1822](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1822)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:1823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1823)

---

### queueDrops

> **queueDrops**: `number`

Defined in: [types/proxy.ts:1824](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1824)

---

### invalidDrops

> **invalidDrops**: `number`

Defined in: [types/proxy.ts:1825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1825)

---

### writeDrops

> **writeDrops**: `number`

Defined in: [types/proxy.ts:1826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1826)

---

### writeFailures

> **writeFailures**: `number`

Defined in: [types/proxy.ts:1827](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1827)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:1829](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1829)

Events requeued after a transient lifecycle metadata write failure.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:1830](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1830)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:1831](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1831)

---

### flushing

> **flushing**: `boolean`

Defined in: [types/proxy.ts:1832](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1832)
