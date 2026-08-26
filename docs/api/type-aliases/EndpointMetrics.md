[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointMetrics

# Type Alias: EndpointMetrics

> **EndpointMetrics** = `object`

Defined in: [types/providers.ts:1774](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1774)

Endpoint metrics and monitoring data

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1776](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1776)

Endpoint name

---

### invocations

> **invocations**: `number`

Defined in: [types/providers.ts:1778](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1778)

Total invocations

---

### averageLatency

> **averageLatency**: `number`

Defined in: [types/providers.ts:1780](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1780)

Average latency in milliseconds

---

### errorRate

> **errorRate**: `number`

Defined in: [types/providers.ts:1782](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1782)

Error rate percentage

---

### cpuUtilization?

> `optional` **cpuUtilization?**: `number`

Defined in: [types/providers.ts:1784](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1784)

CPU utilization percentage

---

### memoryUtilization?

> `optional` **memoryUtilization?**: `number`

Defined in: [types/providers.ts:1786](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1786)

Memory utilization percentage

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1788](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1788)

Instance count

---

### timestamp

> **timestamp**: `string`

Defined in: [types/providers.ts:1790](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1790)

Timestamp of metrics as ISO 8601 date string
