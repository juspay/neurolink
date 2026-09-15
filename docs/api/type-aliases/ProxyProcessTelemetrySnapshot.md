[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyProcessTelemetrySnapshot

# Type Alias: ProxyProcessTelemetrySnapshot

> **ProxyProcessTelemetrySnapshot** = `object`

Defined in: [types/proxyRestart.ts:66](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L66)

Small read-only process evidence, excluding environment variables and log content.

## Properties

### pid

> **pid**: `number`

Defined in: [types/proxyRestart.ts:67](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L67)

---

### checkedAt

> **checkedAt**: `string`

Defined in: [types/proxyRestart.ts:68](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L68)

---

### configuredSink

> **configuredSink**: `"otel"` \| `"file"`

Defined in: [types/proxyRestart.ts:69](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L69)

---

### lifecycleSink

> **lifecycleSink**: `string`

Defined in: [types/proxyRestart.ts:70](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L70)

---

### otelInitialized

> **otelInitialized**: `boolean`

Defined in: [types/proxyRestart.ts:71](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L71)

---

### stdio

> **stdio**: `object`

Defined in: [types/proxyRestart.ts:72](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L72)

#### stdout

> **stdout**: `"file"` \| `"non_file"` \| `"unavailable"`

#### stderr

> **stderr**: `"file"` \| `"non_file"` \| `"unavailable"`

---

### exportDropped

> **exportDropped**: `number`

Defined in: [types/proxyRestart.ts:76](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L76)

---

### exportUnconfirmed

> **exportUnconfirmed**: `number`

Defined in: [types/proxyRestart.ts:77](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L77)
