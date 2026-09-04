[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerSnapshot

# Type Alias: ProxyLifecycleLoggerSnapshot

> **ProxyLifecycleLoggerSnapshot** = `object`

Defined in: [types/proxy.ts:1919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1919)

Data-quality counters for the bounded lifecycle metadata sink.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1920)

---

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/proxy.ts:1921](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1921)

---

### processInstanceId

> **processInstanceId**: `string`

Defined in: [types/proxy.ts:1922](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1922)

---

### nextSequence

> **nextSequence**: `number`

Defined in: [types/proxy.ts:1923](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1923)

---

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:1924](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1924)

---

### enqueued

> **enqueued**: `number`

Defined in: [types/proxy.ts:1925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1925)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:1926](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1926)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:1927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1927)

---

### queueDrops

> **queueDrops**: `number`

Defined in: [types/proxy.ts:1928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1928)

---

### invalidDrops

> **invalidDrops**: `number`

Defined in: [types/proxy.ts:1929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1929)

---

### writeDrops

> **writeDrops**: `number`

Defined in: [types/proxy.ts:1930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1930)

---

### writeFailures

> **writeFailures**: `number`

Defined in: [types/proxy.ts:1931](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1931)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:1933](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1933)

Events requeued after a transient lifecycle metadata write failure.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:1934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1934)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:1935](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1935)

---

### flushing

> **flushing**: `boolean`

Defined in: [types/proxy.ts:1936](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1936)
