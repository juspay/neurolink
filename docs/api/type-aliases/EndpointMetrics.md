[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointMetrics

# Type Alias: EndpointMetrics

> **EndpointMetrics** = `object`

Defined in: [types/providers.ts:1817](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1817)

Endpoint metrics and monitoring data

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1819](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1819)

Endpoint name

---

### invocations

> **invocations**: `number`

Defined in: [types/providers.ts:1821](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1821)

Total invocations

---

### averageLatency

> **averageLatency**: `number`

Defined in: [types/providers.ts:1823](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1823)

Average latency in milliseconds

---

### errorRate

> **errorRate**: `number`

Defined in: [types/providers.ts:1825](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1825)

Error rate percentage

---

### cpuUtilization?

> `optional` **cpuUtilization?**: `number`

Defined in: [types/providers.ts:1827](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1827)

CPU utilization percentage

---

### memoryUtilization?

> `optional` **memoryUtilization?**: `number`

Defined in: [types/providers.ts:1829](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1829)

Memory utilization percentage

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1831](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1831)

Instance count

---

### timestamp

> **timestamp**: `string`

Defined in: [types/providers.ts:1833](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1833)

Timestamp of metrics as ISO 8601 date string
