[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerSnapshot

# Type Alias: ProxyLifecycleLoggerSnapshot

> **ProxyLifecycleLoggerSnapshot** = `object`

Defined in: [types/proxy.ts:2154](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2154)

Data-quality counters for the bounded lifecycle metadata sink.

## Properties

### sink?

> `optional` **sink?**: `"otel"` \| `"file"`

Defined in: [types/proxy.ts:2155](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2155)

---

### admissionPolicy?

> `optional` **admissionPolicy?**: `"best-effort"` \| `"durable-file"`

Defined in: [types/proxy.ts:2156](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2156)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2157](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2157)

---

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/proxy.ts:2158](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2158)

---

### processInstanceId

> **processInstanceId**: `string`

Defined in: [types/proxy.ts:2159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2159)

---

### nextSequence

> **nextSequence**: `number`

Defined in: [types/proxy.ts:2160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2160)

---

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:2161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2161)

---

### otelSubmitted

> **otelSubmitted**: `number`

Defined in: [types/proxy.ts:2163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2163)

Records delegated to the OTel sink; delivery is reported by its queues.

---

### enqueued

> **enqueued**: `number`

Defined in: [types/proxy.ts:2164](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2164)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:2165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2165)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:2166](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2166)

---

### queueDrops

> **queueDrops**: `number`

Defined in: [types/proxy.ts:2167](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2167)

---

### invalidDrops

> **invalidDrops**: `number`

Defined in: [types/proxy.ts:2168](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2168)

---

### writeDrops

> **writeDrops**: `number`

Defined in: [types/proxy.ts:2169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2169)

---

### writeFailures

> **writeFailures**: `number`

Defined in: [types/proxy.ts:2170](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2170)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2172](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2172)

Events requeued after a transient lifecycle metadata write failure.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:2174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2174)

Slow appends still owned by the original writer, never replayed on timeout.

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:2176](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2176)

Records in failed appends that may have partially reached the file.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:2177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2177)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:2178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2178)

---

### flushing

> **flushing**: `boolean`

Defined in: [types/proxy.ts:2179](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2179)
