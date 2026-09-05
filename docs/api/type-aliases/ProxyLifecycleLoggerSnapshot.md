[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerSnapshot

# Type Alias: ProxyLifecycleLoggerSnapshot

> **ProxyLifecycleLoggerSnapshot** = `object`

Defined in: [types/proxy.ts:1925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1925)

Data-quality counters for the bounded lifecycle metadata sink.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1926](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1926)

---

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/proxy.ts:1927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1927)

---

### processInstanceId

> **processInstanceId**: `string`

Defined in: [types/proxy.ts:1928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1928)

---

### nextSequence

> **nextSequence**: `number`

Defined in: [types/proxy.ts:1929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1929)

---

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:1930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1930)

---

### enqueued

> **enqueued**: `number`

Defined in: [types/proxy.ts:1931](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1931)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:1932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1932)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:1933](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1933)

---

### queueDrops

> **queueDrops**: `number`

Defined in: [types/proxy.ts:1934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1934)

---

### invalidDrops

> **invalidDrops**: `number`

Defined in: [types/proxy.ts:1935](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1935)

---

### writeDrops

> **writeDrops**: `number`

Defined in: [types/proxy.ts:1936](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1936)

---

### writeFailures

> **writeFailures**: `number`

Defined in: [types/proxy.ts:1937](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1937)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:1939](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1939)

Events requeued after a transient lifecycle metadata write failure.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:1940](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1940)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:1941](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1941)

---

### flushing

> **flushing**: `boolean`

Defined in: [types/proxy.ts:1942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1942)
