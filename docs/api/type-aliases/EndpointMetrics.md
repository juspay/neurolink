[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointMetrics

# Type Alias: EndpointMetrics

> **EndpointMetrics** = `object`

Defined in: [types/providers.ts:1777](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1777)

Endpoint metrics and monitoring data

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1779](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1779)

Endpoint name

---

### invocations

> **invocations**: `number`

Defined in: [types/providers.ts:1781](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1781)

Total invocations

---

### averageLatency

> **averageLatency**: `number`

Defined in: [types/providers.ts:1783](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1783)

Average latency in milliseconds

---

### errorRate

> **errorRate**: `number`

Defined in: [types/providers.ts:1785](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1785)

Error rate percentage

---

### cpuUtilization?

> `optional` **cpuUtilization?**: `number`

Defined in: [types/providers.ts:1787](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1787)

CPU utilization percentage

---

### memoryUtilization?

> `optional` **memoryUtilization?**: `number`

Defined in: [types/providers.ts:1789](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1789)

Memory utilization percentage

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1791](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1791)

Instance count

---

### timestamp

> **timestamp**: `string`

Defined in: [types/providers.ts:1793](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1793)

Timestamp of metrics as ISO 8601 date string
