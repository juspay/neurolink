[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerSnapshot

# Type Alias: ProxyLifecycleLoggerSnapshot

> **ProxyLifecycleLoggerSnapshot** = `object`

Defined in: [types/proxy.ts:2346](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2346)

Data-quality counters for the bounded lifecycle metadata sink.

## Properties

### sink?

> `optional` **sink?**: `"otel"` \| `"file"`

Defined in: [types/proxy.ts:2347](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2347)

---

### admissionPolicy?

> `optional` **admissionPolicy?**: `"best-effort"` \| `"durable-file"`

Defined in: [types/proxy.ts:2348](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2348)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2349](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2349)

---

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/proxy.ts:2350](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2350)

---

### processInstanceId

> **processInstanceId**: `string`

Defined in: [types/proxy.ts:2351](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2351)

---

### nextSequence

> **nextSequence**: `number`

Defined in: [types/proxy.ts:2352](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2352)

---

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:2353](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2353)

---

### otelSubmitted

> **otelSubmitted**: `number`

Defined in: [types/proxy.ts:2355](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2355)

Records delegated to the OTel sink; delivery is reported by its queues.

---

### enqueued

> **enqueued**: `number`

Defined in: [types/proxy.ts:2356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2356)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:2357](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2357)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:2358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2358)

---

### queueDrops

> **queueDrops**: `number`

Defined in: [types/proxy.ts:2359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2359)

---

### invalidDrops

> **invalidDrops**: `number`

Defined in: [types/proxy.ts:2360](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2360)

---

### writeDrops

> **writeDrops**: `number`

Defined in: [types/proxy.ts:2361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2361)

---

### writeFailures

> **writeFailures**: `number`

Defined in: [types/proxy.ts:2362](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2362)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2364](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2364)

Events requeued after a transient lifecycle metadata write failure.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:2366](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2366)

Slow appends still owned by the original writer, never replayed on timeout.

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:2368](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2368)

Records in failed appends that may have partially reached the file.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:2369](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2369)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:2370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2370)

---

### flushing

> **flushing**: `boolean`

Defined in: [types/proxy.ts:2371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2371)
