[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerSnapshot

# Type Alias: ProxyLifecycleLoggerSnapshot

> **ProxyLifecycleLoggerSnapshot** = `object`

Defined in: [types/proxy.ts:2326](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2326)

Data-quality counters for the bounded lifecycle metadata sink.

## Properties

### sink?

> `optional` **sink?**: `"otel"` \| `"file"`

Defined in: [types/proxy.ts:2327](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2327)

---

### admissionPolicy?

> `optional` **admissionPolicy?**: `"best-effort"` \| `"durable-file"`

Defined in: [types/proxy.ts:2328](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2328)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2329](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2329)

---

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/proxy.ts:2330](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2330)

---

### processInstanceId

> **processInstanceId**: `string`

Defined in: [types/proxy.ts:2331](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2331)

---

### nextSequence

> **nextSequence**: `number`

Defined in: [types/proxy.ts:2332](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2332)

---

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:2333](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2333)

---

### otelSubmitted

> **otelSubmitted**: `number`

Defined in: [types/proxy.ts:2335](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2335)

Records delegated to the OTel sink; delivery is reported by its queues.

---

### enqueued

> **enqueued**: `number`

Defined in: [types/proxy.ts:2336](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2336)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:2337](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2337)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:2338](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2338)

---

### queueDrops

> **queueDrops**: `number`

Defined in: [types/proxy.ts:2339](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2339)

---

### invalidDrops

> **invalidDrops**: `number`

Defined in: [types/proxy.ts:2340](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2340)

---

### writeDrops

> **writeDrops**: `number`

Defined in: [types/proxy.ts:2341](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2341)

---

### writeFailures

> **writeFailures**: `number`

Defined in: [types/proxy.ts:2342](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2342)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2344](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2344)

Events requeued after a transient lifecycle metadata write failure.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:2346](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2346)

Slow appends still owned by the original writer, never replayed on timeout.

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:2348](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2348)

Records in failed appends that may have partially reached the file.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:2349](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2349)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:2350](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2350)

---

### flushing

> **flushing**: `boolean`

Defined in: [types/proxy.ts:2351](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2351)
