[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerSnapshot

# Type Alias: ProxyLifecycleLoggerSnapshot

> **ProxyLifecycleLoggerSnapshot** = `object`

Defined in: [types/proxy.ts:2171](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2171)

Data-quality counters for the bounded lifecycle metadata sink.

## Properties

### sink?

> `optional` **sink?**: `"otel"` \| `"file"`

Defined in: [types/proxy.ts:2172](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2172)

---

### admissionPolicy?

> `optional` **admissionPolicy?**: `"best-effort"` \| `"durable-file"`

Defined in: [types/proxy.ts:2173](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2173)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2174)

---

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/proxy.ts:2175](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2175)

---

### processInstanceId

> **processInstanceId**: `string`

Defined in: [types/proxy.ts:2176](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2176)

---

### nextSequence

> **nextSequence**: `number`

Defined in: [types/proxy.ts:2177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2177)

---

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:2178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2178)

---

### otelSubmitted

> **otelSubmitted**: `number`

Defined in: [types/proxy.ts:2180](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2180)

Records delegated to the OTel sink; delivery is reported by its queues.

---

### enqueued

> **enqueued**: `number`

Defined in: [types/proxy.ts:2181](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2181)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:2182](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2182)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:2183](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2183)

---

### queueDrops

> **queueDrops**: `number`

Defined in: [types/proxy.ts:2184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2184)

---

### invalidDrops

> **invalidDrops**: `number`

Defined in: [types/proxy.ts:2185](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2185)

---

### writeDrops

> **writeDrops**: `number`

Defined in: [types/proxy.ts:2186](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2186)

---

### writeFailures

> **writeFailures**: `number`

Defined in: [types/proxy.ts:2187](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2187)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2189](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2189)

Events requeued after a transient lifecycle metadata write failure.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:2191](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2191)

Slow appends still owned by the original writer, never replayed on timeout.

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:2193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2193)

Records in failed appends that may have partially reached the file.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:2194](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2194)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:2195](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2195)

---

### flushing

> **flushing**: `boolean`

Defined in: [types/proxy.ts:2196](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2196)
