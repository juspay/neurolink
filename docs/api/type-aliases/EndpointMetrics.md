[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointMetrics

# Type Alias: EndpointMetrics

> **EndpointMetrics** = `object`

Defined in: [types/providers.ts:1848](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1848)

Endpoint metrics and monitoring data

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1850](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1850)

Endpoint name

---

### invocations

> **invocations**: `number`

Defined in: [types/providers.ts:1852](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1852)

Total invocations

---

### averageLatency

> **averageLatency**: `number`

Defined in: [types/providers.ts:1854](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1854)

Average latency in milliseconds

---

### errorRate

> **errorRate**: `number`

Defined in: [types/providers.ts:1856](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1856)

Error rate percentage

---

### cpuUtilization?

> `optional` **cpuUtilization?**: `number`

Defined in: [types/providers.ts:1858](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1858)

CPU utilization percentage

---

### memoryUtilization?

> `optional` **memoryUtilization?**: `number`

Defined in: [types/providers.ts:1860](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1860)

Memory utilization percentage

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1862](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1862)

Instance count

---

### timestamp

> **timestamp**: `string`

Defined in: [types/providers.ts:1864](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1864)

Timestamp of metrics as ISO 8601 date string
