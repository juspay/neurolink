[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerSnapshot

# Type Alias: ProxyLifecycleLoggerSnapshot

> **ProxyLifecycleLoggerSnapshot** = `object`

Defined in: [types/proxy.ts:2447](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2447)

Data-quality counters for the bounded lifecycle metadata sink.

## Properties

### sink?

> `optional` **sink?**: `"otel"` \| `"file"`

Defined in: [types/proxy.ts:2448](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2448)

---

### admissionPolicy?

> `optional` **admissionPolicy?**: `"best-effort"` \| `"durable-file"`

Defined in: [types/proxy.ts:2449](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2449)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2450](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2450)

---

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/proxy.ts:2451](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2451)

---

### processInstanceId

> **processInstanceId**: `string`

Defined in: [types/proxy.ts:2452](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2452)

---

### nextSequence

> **nextSequence**: `number`

Defined in: [types/proxy.ts:2453](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2453)

---

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:2454](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2454)

---

### otelSubmitted

> **otelSubmitted**: `number`

Defined in: [types/proxy.ts:2456](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2456)

Records delegated to the OTel sink; delivery is reported by its queues.

---

### enqueued

> **enqueued**: `number`

Defined in: [types/proxy.ts:2457](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2457)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:2458](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2458)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:2459](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2459)

---

### queueDrops

> **queueDrops**: `number`

Defined in: [types/proxy.ts:2460](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2460)

---

### invalidDrops

> **invalidDrops**: `number`

Defined in: [types/proxy.ts:2461](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2461)

---

### writeDrops

> **writeDrops**: `number`

Defined in: [types/proxy.ts:2462](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2462)

---

### writeFailures

> **writeFailures**: `number`

Defined in: [types/proxy.ts:2463](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2463)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2465](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2465)

Events requeued after a transient lifecycle metadata write failure.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:2467](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2467)

Slow appends still owned by the original writer, never replayed on timeout.

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:2469](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2469)

Records in failed appends that may have partially reached the file.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:2470](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2470)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:2471](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2471)

---

### flushing

> **flushing**: `boolean`

Defined in: [types/proxy.ts:2472](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2472)
