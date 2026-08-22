[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointMetrics

# Type Alias: EndpointMetrics

> **EndpointMetrics** = `object`

Defined in: [types/providers.ts:1773](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1773)

Endpoint metrics and monitoring data

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1775](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1775)

Endpoint name

---

### invocations

> **invocations**: `number`

Defined in: [types/providers.ts:1777](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1777)

Total invocations

---

### averageLatency

> **averageLatency**: `number`

Defined in: [types/providers.ts:1779](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1779)

Average latency in milliseconds

---

### errorRate

> **errorRate**: `number`

Defined in: [types/providers.ts:1781](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1781)

Error rate percentage

---

### cpuUtilization?

> `optional` **cpuUtilization?**: `number`

Defined in: [types/providers.ts:1783](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1783)

CPU utilization percentage

---

### memoryUtilization?

> `optional` **memoryUtilization?**: `number`

Defined in: [types/providers.ts:1785](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1785)

Memory utilization percentage

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1787](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1787)

Instance count

---

### timestamp

> **timestamp**: `string`

Defined in: [types/providers.ts:1789](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1789)

Timestamp of metrics as ISO 8601 date string
