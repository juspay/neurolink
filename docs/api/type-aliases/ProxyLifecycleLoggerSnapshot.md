[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerSnapshot

# Type Alias: ProxyLifecycleLoggerSnapshot

> **ProxyLifecycleLoggerSnapshot** = `object`

Data-quality counters for the bounded lifecycle metadata sink.

## Properties

### sink?

> `optional` **sink?**: `"otel"` \| `"file"`

---

### admissionPolicy?

> `optional` **admissionPolicy?**: `"best-effort"` \| `"durable-file"`

---

### enabled

> **enabled**: `boolean`

---

### schemaVersion

> **schemaVersion**: `number`

---

### processInstanceId

> **processInstanceId**: `string`

---

### nextSequence

> **nextSequence**: `number`

---

### attempted

> **attempted**: `number`

---

### otelSubmitted

> **otelSubmitted**: `number`

Records delegated to the OTel sink; delivery is reported by its queues.

---

### enqueued

> **enqueued**: `number`

---

### written

> **written**: `number`

---

### dropped

> **dropped**: `number`

---

### queueDrops

> **queueDrops**: `number`

---

### invalidDrops

> **invalidDrops**: `number`

---

### writeDrops

> **writeDrops**: `number`

---

### writeFailures

> **writeFailures**: `number`

---

### writeRetries

> **writeRetries**: `number`

Events requeued after a transient lifecycle metadata write failure.

---

### writeTimeouts

> **writeTimeouts**: `number`

Slow appends still owned by the original writer, never replayed on timeout.

---

### unconfirmedWrites

> **unconfirmedWrites**: `number`

Records in failed appends that may have partially reached the file.

---

### pending

> **pending**: `number`

---

### inFlight

> **inFlight**: `number`

---

### flushing

> **flushing**: `boolean`
