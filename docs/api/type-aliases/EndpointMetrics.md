[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointMetrics

# Type Alias: EndpointMetrics

> **EndpointMetrics** = `object`

Defined in: [types/providers.ts:1790](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1790)

Endpoint metrics and monitoring data

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1792](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1792)

Endpoint name

---

### invocations

> **invocations**: `number`

Defined in: [types/providers.ts:1794](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1794)

Total invocations

---

### averageLatency

> **averageLatency**: `number`

Defined in: [types/providers.ts:1796](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1796)

Average latency in milliseconds

---

### errorRate

> **errorRate**: `number`

Defined in: [types/providers.ts:1798](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1798)

Error rate percentage

---

### cpuUtilization?

> `optional` **cpuUtilization?**: `number`

Defined in: [types/providers.ts:1800](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1800)

CPU utilization percentage

---

### memoryUtilization?

> `optional` **memoryUtilization?**: `number`

Defined in: [types/providers.ts:1802](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1802)

Memory utilization percentage

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1804](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1804)

Instance count

---

### timestamp

> **timestamp**: `string`

Defined in: [types/providers.ts:1806](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1806)

Timestamp of metrics as ISO 8601 date string
