[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerSnapshot

# Type Alias: ProxyLifecycleLoggerSnapshot

> **ProxyLifecycleLoggerSnapshot** = `object`

Defined in: [types/proxy.ts:2349](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2349)

Data-quality counters for the bounded lifecycle metadata sink.

## Properties

### sink?

> `optional` **sink?**: `"otel"` \| `"file"`

Defined in: [types/proxy.ts:2350](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2350)

---

### admissionPolicy?

> `optional` **admissionPolicy?**: `"best-effort"` \| `"durable-file"`

Defined in: [types/proxy.ts:2351](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2351)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2352](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2352)

---

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/proxy.ts:2353](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2353)

---

### processInstanceId

> **processInstanceId**: `string`

Defined in: [types/proxy.ts:2354](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2354)

---

### nextSequence

> **nextSequence**: `number`

Defined in: [types/proxy.ts:2355](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2355)

---

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:2356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2356)

---

### otelSubmitted

> **otelSubmitted**: `number`

Defined in: [types/proxy.ts:2358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2358)

Records delegated to the OTel sink; delivery is reported by its queues.

---

### enqueued

> **enqueued**: `number`

Defined in: [types/proxy.ts:2359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2359)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:2360](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2360)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:2361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2361)

---

### queueDrops

> **queueDrops**: `number`

Defined in: [types/proxy.ts:2362](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2362)

---

### invalidDrops

> **invalidDrops**: `number`

Defined in: [types/proxy.ts:2363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2363)

---

### writeDrops

> **writeDrops**: `number`

Defined in: [types/proxy.ts:2364](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2364)

---

### writeFailures

> **writeFailures**: `number`

Defined in: [types/proxy.ts:2365](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2365)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2367](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2367)

Events requeued after a transient lifecycle metadata write failure.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:2369](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2369)

Slow appends still owned by the original writer, never replayed on timeout.

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:2371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2371)

Records in failed appends that may have partially reached the file.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:2372](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2372)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:2373](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2373)

---

### flushing

> **flushing**: `boolean`

Defined in: [types/proxy.ts:2374](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2374)
