[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExecutionConfig

# Type Alias: ExecutionConfig

> **ExecutionConfig** = `object`

Workflow execution configuration

## Properties

### timeout?

> `optional` **timeout?**: `number`

---

### modelTimeout?

> `optional` **modelTimeout?**: `number`

---

### judgeTimeout?

> `optional` **judgeTimeout?**: `number`

---

### retries?

> `optional` **retries?**: `number`

---

### retryDelay?

> `optional` **retryDelay?**: `number`

---

### retryableErrors?

> `optional` **retryableErrors?**: `string`[]

---

### parallelism?

> `optional` **parallelism?**: `number`

---

### earlyTermination?

> `optional` **earlyTermination?**: `boolean`

---

### minResponses?

> `optional` **minResponses?**: `number`

---

### maxCost?

> `optional` **maxCost?**: `number`

---

### costThreshold?

> `optional` **costThreshold?**: `number`

---

### enableMetrics?

> `optional` **enableMetrics?**: `boolean`

---

### enableTracing?

> `optional` **enableTracing?**: `boolean`

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>
