[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointMetrics

# Type Alias: EndpointMetrics

> **EndpointMetrics** = `object`

Defined in: [types/providers.ts:1805](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1805)

Endpoint metrics and monitoring data

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1807](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1807)

Endpoint name

---

### invocations

> **invocations**: `number`

Defined in: [types/providers.ts:1809](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1809)

Total invocations

---

### averageLatency

> **averageLatency**: `number`

Defined in: [types/providers.ts:1811](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1811)

Average latency in milliseconds

---

### errorRate

> **errorRate**: `number`

Defined in: [types/providers.ts:1813](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1813)

Error rate percentage

---

### cpuUtilization?

> `optional` **cpuUtilization?**: `number`

Defined in: [types/providers.ts:1815](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1815)

CPU utilization percentage

---

### memoryUtilization?

> `optional` **memoryUtilization?**: `number`

Defined in: [types/providers.ts:1817](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1817)

Memory utilization percentage

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1819](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1819)

Instance count

---

### timestamp

> **timestamp**: `string`

Defined in: [types/providers.ts:1821](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1821)

Timestamp of metrics as ISO 8601 date string
