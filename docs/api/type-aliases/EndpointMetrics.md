[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointMetrics

# Type Alias: EndpointMetrics

> **EndpointMetrics** = `object`

Defined in: [types/providers.ts:1818](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1818)

Endpoint metrics and monitoring data

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1820](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1820)

Endpoint name

---

### invocations

> **invocations**: `number`

Defined in: [types/providers.ts:1822](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1822)

Total invocations

---

### averageLatency

> **averageLatency**: `number`

Defined in: [types/providers.ts:1824](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1824)

Average latency in milliseconds

---

### errorRate

> **errorRate**: `number`

Defined in: [types/providers.ts:1826](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1826)

Error rate percentage

---

### cpuUtilization?

> `optional` **cpuUtilization?**: `number`

Defined in: [types/providers.ts:1828](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1828)

CPU utilization percentage

---

### memoryUtilization?

> `optional` **memoryUtilization?**: `number`

Defined in: [types/providers.ts:1830](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1830)

Memory utilization percentage

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1832](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1832)

Instance count

---

### timestamp

> **timestamp**: `string`

Defined in: [types/providers.ts:1834](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1834)

Timestamp of metrics as ISO 8601 date string
