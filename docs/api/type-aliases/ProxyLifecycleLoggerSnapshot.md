[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerSnapshot

# Type Alias: ProxyLifecycleLoggerSnapshot

> **ProxyLifecycleLoggerSnapshot** = `object`

Defined in: [types/proxy.ts:2275](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2275)

Data-quality counters for the bounded lifecycle metadata sink.

## Properties

### sink?

> `optional` **sink?**: `"otel"` \| `"file"`

Defined in: [types/proxy.ts:2276](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2276)

---

### admissionPolicy?

> `optional` **admissionPolicy?**: `"best-effort"` \| `"durable-file"`

Defined in: [types/proxy.ts:2277](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2277)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2278](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2278)

---

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/proxy.ts:2279](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2279)

---

### processInstanceId

> **processInstanceId**: `string`

Defined in: [types/proxy.ts:2280](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2280)

---

### nextSequence

> **nextSequence**: `number`

Defined in: [types/proxy.ts:2281](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2281)

---

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:2282](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2282)

---

### otelSubmitted

> **otelSubmitted**: `number`

Defined in: [types/proxy.ts:2284](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2284)

Records delegated to the OTel sink; delivery is reported by its queues.

---

### enqueued

> **enqueued**: `number`

Defined in: [types/proxy.ts:2285](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2285)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:2286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2286)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:2287](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2287)

---

### queueDrops

> **queueDrops**: `number`

Defined in: [types/proxy.ts:2288](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2288)

---

### invalidDrops

> **invalidDrops**: `number`

Defined in: [types/proxy.ts:2289](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2289)

---

### writeDrops

> **writeDrops**: `number`

Defined in: [types/proxy.ts:2290](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2290)

---

### writeFailures

> **writeFailures**: `number`

Defined in: [types/proxy.ts:2291](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2291)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2293](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2293)

Events requeued after a transient lifecycle metadata write failure.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:2295](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2295)

Slow appends still owned by the original writer, never replayed on timeout.

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:2297](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2297)

Records in failed appends that may have partially reached the file.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:2298](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2298)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:2299](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2299)

---

### flushing

> **flushing**: `boolean`

Defined in: [types/proxy.ts:2300](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2300)
