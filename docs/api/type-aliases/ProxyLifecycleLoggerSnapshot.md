[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerSnapshot

# Type Alias: ProxyLifecycleLoggerSnapshot

> **ProxyLifecycleLoggerSnapshot** = `object`

Defined in: [types/proxy.ts:2046](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2046)

Data-quality counters for the bounded lifecycle metadata sink.

## Properties

### sink?

> `optional` **sink?**: `"otel"` \| `"file"`

Defined in: [types/proxy.ts:2047](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2047)

---

### admissionPolicy?

> `optional` **admissionPolicy?**: `"best-effort"` \| `"durable-file"`

Defined in: [types/proxy.ts:2048](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2048)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2049](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2049)

---

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/proxy.ts:2050](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2050)

---

### processInstanceId

> **processInstanceId**: `string`

Defined in: [types/proxy.ts:2051](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2051)

---

### nextSequence

> **nextSequence**: `number`

Defined in: [types/proxy.ts:2052](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2052)

---

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:2053](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2053)

---

### enqueued

> **enqueued**: `number`

Defined in: [types/proxy.ts:2054](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2054)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:2055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2055)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:2056](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2056)

---

### queueDrops

> **queueDrops**: `number`

Defined in: [types/proxy.ts:2057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2057)

---

### invalidDrops

> **invalidDrops**: `number`

Defined in: [types/proxy.ts:2058](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2058)

---

### writeDrops

> **writeDrops**: `number`

Defined in: [types/proxy.ts:2059](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2059)

---

### writeFailures

> **writeFailures**: `number`

Defined in: [types/proxy.ts:2060](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2060)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2062](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2062)

Events requeued after a transient lifecycle metadata write failure.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:2064](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2064)

Slow appends still owned by the original writer, never replayed on timeout.

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:2066](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2066)

Records in failed appends that may have partially reached the file.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:2067](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2067)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:2068](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2068)

---

### flushing

> **flushing**: `boolean`

Defined in: [types/proxy.ts:2069](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2069)
