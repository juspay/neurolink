[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointMetrics

# Type Alias: EndpointMetrics

> **EndpointMetrics** = `object`

Defined in: [types/providers.ts:1853](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1853)

Endpoint metrics and monitoring data

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1855](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1855)

Endpoint name

---

### invocations

> **invocations**: `number`

Defined in: [types/providers.ts:1857](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1857)

Total invocations

---

### averageLatency

> **averageLatency**: `number`

Defined in: [types/providers.ts:1859](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1859)

Average latency in milliseconds

---

### errorRate

> **errorRate**: `number`

Defined in: [types/providers.ts:1861](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1861)

Error rate percentage

---

### cpuUtilization?

> `optional` **cpuUtilization?**: `number`

Defined in: [types/providers.ts:1863](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1863)

CPU utilization percentage

---

### memoryUtilization?

> `optional` **memoryUtilization?**: `number`

Defined in: [types/providers.ts:1865](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1865)

Memory utilization percentage

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1867](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1867)

Instance count

---

### timestamp

> **timestamp**: `string`

Defined in: [types/providers.ts:1869](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1869)

Timestamp of metrics as ISO 8601 date string
