[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointMetrics

# Type Alias: EndpointMetrics

> **EndpointMetrics** = `object`

Defined in: [types/providers.ts:1791](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1791)

Endpoint metrics and monitoring data

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1793](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1793)

Endpoint name

---

### invocations

> **invocations**: `number`

Defined in: [types/providers.ts:1795](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1795)

Total invocations

---

### averageLatency

> **averageLatency**: `number`

Defined in: [types/providers.ts:1797](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1797)

Average latency in milliseconds

---

### errorRate

> **errorRate**: `number`

Defined in: [types/providers.ts:1799](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1799)

Error rate percentage

---

### cpuUtilization?

> `optional` **cpuUtilization?**: `number`

Defined in: [types/providers.ts:1801](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1801)

CPU utilization percentage

---

### memoryUtilization?

> `optional` **memoryUtilization?**: `number`

Defined in: [types/providers.ts:1803](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1803)

Memory utilization percentage

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1805](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1805)

Instance count

---

### timestamp

> **timestamp**: `string`

Defined in: [types/providers.ts:1807](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1807)

Timestamp of metrics as ISO 8601 date string
