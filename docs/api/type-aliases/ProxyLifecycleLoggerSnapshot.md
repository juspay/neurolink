[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerSnapshot

# Type Alias: ProxyLifecycleLoggerSnapshot

> **ProxyLifecycleLoggerSnapshot** = `object`

Defined in: [types/proxy.ts:2145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2145)

Data-quality counters for the bounded lifecycle metadata sink.

## Properties

### sink?

> `optional` **sink?**: `"otel"` \| `"file"`

Defined in: [types/proxy.ts:2146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2146)

---

### admissionPolicy?

> `optional` **admissionPolicy?**: `"best-effort"` \| `"durable-file"`

Defined in: [types/proxy.ts:2147](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2147)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2148)

---

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/proxy.ts:2149](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2149)

---

### processInstanceId

> **processInstanceId**: `string`

Defined in: [types/proxy.ts:2150](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2150)

---

### nextSequence

> **nextSequence**: `number`

Defined in: [types/proxy.ts:2151](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2151)

---

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:2152](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2152)

---

### enqueued

> **enqueued**: `number`

Defined in: [types/proxy.ts:2153](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2153)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:2154](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2154)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:2155](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2155)

---

### queueDrops

> **queueDrops**: `number`

Defined in: [types/proxy.ts:2156](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2156)

---

### invalidDrops

> **invalidDrops**: `number`

Defined in: [types/proxy.ts:2157](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2157)

---

### writeDrops

> **writeDrops**: `number`

Defined in: [types/proxy.ts:2158](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2158)

---

### writeFailures

> **writeFailures**: `number`

Defined in: [types/proxy.ts:2159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2159)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2161)

Events requeued after a transient lifecycle metadata write failure.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:2163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2163)

Slow appends still owned by the original writer, never replayed on timeout.

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:2165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2165)

Records in failed appends that may have partially reached the file.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:2166](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2166)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:2167](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2167)

---

### flushing

> **flushing**: `boolean`

Defined in: [types/proxy.ts:2168](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2168)
