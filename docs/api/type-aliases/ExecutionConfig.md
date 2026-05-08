[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExecutionConfig

# Type Alias: ExecutionConfig

> **ExecutionConfig** = `object`

Defined in: [types/workflow.ts:195](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L195)

Workflow execution configuration

## Properties

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/workflow.ts:197](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L197)

---

### modelTimeout?

> `optional` **modelTimeout?**: `number`

Defined in: [types/workflow.ts:198](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L198)

---

### judgeTimeout?

> `optional` **judgeTimeout?**: `number`

Defined in: [types/workflow.ts:199](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L199)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/workflow.ts:202](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L202)

---

### retryDelay?

> `optional` **retryDelay?**: `number`

Defined in: [types/workflow.ts:203](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L203)

---

### retryableErrors?

> `optional` **retryableErrors?**: `string`[]

Defined in: [types/workflow.ts:204](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L204)

---

### parallelism?

> `optional` **parallelism?**: `number`

Defined in: [types/workflow.ts:207](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L207)

---

### earlyTermination?

> `optional` **earlyTermination?**: `boolean`

Defined in: [types/workflow.ts:208](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L208)

---

### minResponses?

> `optional` **minResponses?**: `number`

Defined in: [types/workflow.ts:209](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L209)

---

### maxCost?

> `optional` **maxCost?**: `number`

Defined in: [types/workflow.ts:212](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L212)

---

### costThreshold?

> `optional` **costThreshold?**: `number`

Defined in: [types/workflow.ts:213](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L213)

---

### enableMetrics?

> `optional` **enableMetrics?**: `boolean`

Defined in: [types/workflow.ts:216](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L216)

---

### enableTracing?

> `optional` **enableTracing?**: `boolean`

Defined in: [types/workflow.ts:217](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L217)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/workflow.ts:220](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L220)
