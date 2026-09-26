[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointMetrics

# Type Alias: EndpointMetrics

> **EndpointMetrics** = `object`

Defined in: [types/providers.ts:1875](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1875)

Endpoint metrics and monitoring data

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1877](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1877)

Endpoint name

---

### invocations

> **invocations**: `number`

Defined in: [types/providers.ts:1879](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1879)

Total invocations

---

### averageLatency

> **averageLatency**: `number`

Defined in: [types/providers.ts:1881](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1881)

Average latency in milliseconds

---

### errorRate

> **errorRate**: `number`

Defined in: [types/providers.ts:1883](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1883)

Error rate percentage

---

### cpuUtilization?

> `optional` **cpuUtilization?**: `number`

Defined in: [types/providers.ts:1885](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1885)

CPU utilization percentage

---

### memoryUtilization?

> `optional` **memoryUtilization?**: `number`

Defined in: [types/providers.ts:1887](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1887)

Memory utilization percentage

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1889](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1889)

Instance count

---

### timestamp

> **timestamp**: `string`

Defined in: [types/providers.ts:1891](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1891)

Timestamp of metrics as ISO 8601 date string
