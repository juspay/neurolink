[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerSnapshot

# Type Alias: ProxyLifecycleLoggerSnapshot

> **ProxyLifecycleLoggerSnapshot** = `object`

Defined in: [types/proxy.ts:2416](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2416)

Data-quality counters for the bounded lifecycle metadata sink.

## Properties

### sink?

> `optional` **sink?**: `"otel"` \| `"file"`

Defined in: [types/proxy.ts:2417](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2417)

---

### admissionPolicy?

> `optional` **admissionPolicy?**: `"best-effort"` \| `"durable-file"`

Defined in: [types/proxy.ts:2418](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2418)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2419](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2419)

---

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/proxy.ts:2420](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2420)

---

### processInstanceId

> **processInstanceId**: `string`

Defined in: [types/proxy.ts:2421](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2421)

---

### nextSequence

> **nextSequence**: `number`

Defined in: [types/proxy.ts:2422](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2422)

---

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:2423](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2423)

---

### otelSubmitted

> **otelSubmitted**: `number`

Defined in: [types/proxy.ts:2425](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2425)

Records delegated to the OTel sink; delivery is reported by its queues.

---

### enqueued

> **enqueued**: `number`

Defined in: [types/proxy.ts:2426](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2426)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:2427](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2427)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:2428](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2428)

---

### queueDrops

> **queueDrops**: `number`

Defined in: [types/proxy.ts:2429](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2429)

---

### invalidDrops

> **invalidDrops**: `number`

Defined in: [types/proxy.ts:2430](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2430)

---

### writeDrops

> **writeDrops**: `number`

Defined in: [types/proxy.ts:2431](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2431)

---

### writeFailures

> **writeFailures**: `number`

Defined in: [types/proxy.ts:2432](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2432)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2434](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2434)

Events requeued after a transient lifecycle metadata write failure.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:2436](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2436)

Slow appends still owned by the original writer, never replayed on timeout.

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:2438](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2438)

Records in failed appends that may have partially reached the file.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:2439](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2439)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:2440](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2440)

---

### flushing

> **flushing**: `boolean`

Defined in: [types/proxy.ts:2441](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2441)
