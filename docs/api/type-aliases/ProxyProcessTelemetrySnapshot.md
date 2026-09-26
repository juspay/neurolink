[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyProcessTelemetrySnapshot

# Type Alias: ProxyProcessTelemetrySnapshot

> **ProxyProcessTelemetrySnapshot** = `object`

Small read-only process evidence, excluding environment variables and log content.

## Properties

### pid

> **pid**: `number`

---

### checkedAt

> **checkedAt**: `string`

---

### configuredSink

> **configuredSink**: `"otel"` \| `"file"`

---

### lifecycleSink

> **lifecycleSink**: `string`

---

### otelInitialized

> **otelInitialized**: `boolean`

---

### stdio

> **stdio**: `object`

#### stdout

> **stdout**: `"file"` \| `"non_file"` \| `"unavailable"`

#### stderr

> **stderr**: `"file"` \| `"non_file"` \| `"unavailable"`

---

### exportDropped

> **exportDropped**: `number`

---

### exportUnconfirmed

> **exportUnconfirmed**: `number`
