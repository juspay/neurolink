[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerSnapshot

# Type Alias: ProxyLifecycleLoggerSnapshot

> **ProxyLifecycleLoggerSnapshot** = `object`

Defined in: [types/proxy.ts:1882](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1882)

Data-quality counters for the bounded lifecycle metadata sink.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1883)

---

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/proxy.ts:1884](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1884)

---

### processInstanceId

> **processInstanceId**: `string`

Defined in: [types/proxy.ts:1885](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1885)

---

### nextSequence

> **nextSequence**: `number`

Defined in: [types/proxy.ts:1886](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1886)

---

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:1887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1887)

---

### enqueued

> **enqueued**: `number`

Defined in: [types/proxy.ts:1888](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1888)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:1889](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1889)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:1890](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1890)

---

### queueDrops

> **queueDrops**: `number`

Defined in: [types/proxy.ts:1891](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1891)

---

### invalidDrops

> **invalidDrops**: `number`

Defined in: [types/proxy.ts:1892](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1892)

---

### writeDrops

> **writeDrops**: `number`

Defined in: [types/proxy.ts:1893](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1893)

---

### writeFailures

> **writeFailures**: `number`

Defined in: [types/proxy.ts:1894](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1894)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:1896](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1896)

Events requeued after a transient lifecycle metadata write failure.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:1897](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1897)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:1898](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1898)

---

### flushing

> **flushing**: `boolean`

Defined in: [types/proxy.ts:1899](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1899)
