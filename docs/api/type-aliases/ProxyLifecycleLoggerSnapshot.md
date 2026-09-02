[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerSnapshot

# Type Alias: ProxyLifecycleLoggerSnapshot

> **ProxyLifecycleLoggerSnapshot** = `object`

Defined in: [types/proxy.ts:1913](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1913)

Data-quality counters for the bounded lifecycle metadata sink.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1914](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1914)

---

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/proxy.ts:1915](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1915)

---

### processInstanceId

> **processInstanceId**: `string`

Defined in: [types/proxy.ts:1916](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1916)

---

### nextSequence

> **nextSequence**: `number`

Defined in: [types/proxy.ts:1917](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1917)

---

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:1918](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1918)

---

### enqueued

> **enqueued**: `number`

Defined in: [types/proxy.ts:1919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1919)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:1920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1920)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:1921](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1921)

---

### queueDrops

> **queueDrops**: `number`

Defined in: [types/proxy.ts:1922](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1922)

---

### invalidDrops

> **invalidDrops**: `number`

Defined in: [types/proxy.ts:1923](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1923)

---

### writeDrops

> **writeDrops**: `number`

Defined in: [types/proxy.ts:1924](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1924)

---

### writeFailures

> **writeFailures**: `number`

Defined in: [types/proxy.ts:1925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1925)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:1927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1927)

Events requeued after a transient lifecycle metadata write failure.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:1928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1928)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:1929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1929)

---

### flushing

> **flushing**: `boolean`

Defined in: [types/proxy.ts:1930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1930)
