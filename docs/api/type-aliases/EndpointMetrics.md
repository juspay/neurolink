[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointMetrics

# Type Alias: EndpointMetrics

> **EndpointMetrics** = `object`

Defined in: [types/providers.ts:1868](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1868)

Endpoint metrics and monitoring data

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1870](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1870)

Endpoint name

---

### invocations

> **invocations**: `number`

Defined in: [types/providers.ts:1872](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1872)

Total invocations

---

### averageLatency

> **averageLatency**: `number`

Defined in: [types/providers.ts:1874](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1874)

Average latency in milliseconds

---

### errorRate

> **errorRate**: `number`

Defined in: [types/providers.ts:1876](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1876)

Error rate percentage

---

### cpuUtilization?

> `optional` **cpuUtilization?**: `number`

Defined in: [types/providers.ts:1878](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1878)

CPU utilization percentage

---

### memoryUtilization?

> `optional` **memoryUtilization?**: `number`

Defined in: [types/providers.ts:1880](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1880)

Memory utilization percentage

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1882](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1882)

Instance count

---

### timestamp

> **timestamp**: `string`

Defined in: [types/providers.ts:1884](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1884)

Timestamp of metrics as ISO 8601 date string
