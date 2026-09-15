[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerSnapshot

# Type Alias: ProxyLifecycleLoggerSnapshot

> **ProxyLifecycleLoggerSnapshot** = `object`

Defined in: [types/proxy.ts:2152](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2152)

Data-quality counters for the bounded lifecycle metadata sink.

## Properties

### sink?

> `optional` **sink?**: `"otel"` \| `"file"`

Defined in: [types/proxy.ts:2153](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2153)

---

### admissionPolicy?

> `optional` **admissionPolicy?**: `"best-effort"` \| `"durable-file"`

Defined in: [types/proxy.ts:2154](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2154)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2155](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2155)

---

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/proxy.ts:2156](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2156)

---

### processInstanceId

> **processInstanceId**: `string`

Defined in: [types/proxy.ts:2157](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2157)

---

### nextSequence

> **nextSequence**: `number`

Defined in: [types/proxy.ts:2158](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2158)

---

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:2159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2159)

---

### enqueued

> **enqueued**: `number`

Defined in: [types/proxy.ts:2160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2160)

---

### written

> **written**: `number`

Defined in: [types/proxy.ts:2161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2161)

---

### dropped

> **dropped**: `number`

Defined in: [types/proxy.ts:2162](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2162)

---

### queueDrops

> **queueDrops**: `number`

Defined in: [types/proxy.ts:2163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2163)

---

### invalidDrops

> **invalidDrops**: `number`

Defined in: [types/proxy.ts:2164](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2164)

---

### writeDrops

> **writeDrops**: `number`

Defined in: [types/proxy.ts:2165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2165)

---

### writeFailures

> **writeFailures**: `number`

Defined in: [types/proxy.ts:2166](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2166)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2168](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2168)

Events requeued after a transient lifecycle metadata write failure.

---

### writeTimeouts

> **writeTimeouts**: `number`

Defined in: [types/proxy.ts:2170](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2170)

Slow appends still owned by the original writer, never replayed on timeout.

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Defined in: [types/proxy.ts:2172](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2172)

Records in failed appends that may have partially reached the file.

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:2173](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2173)

---

### inFlight

> **inFlight**: `number`

Defined in: [types/proxy.ts:2174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2174)

---

### flushing

> **flushing**: `boolean`

Defined in: [types/proxy.ts:2175](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2175)
