[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelRoutingOptions

# Type Alias: ModelRoutingOptions

> **ModelRoutingOptions** = `object`

Defined in: [types/model.ts:253](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L253)

## Properties

### forceTaskType?

> `optional` **forceTaskType?**: [`TaskType`](TaskType.md)

Defined in: [types/model.ts:255](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L255)

Override the task classification

---

### requireFast?

> `optional` **requireFast?**: `boolean`

Defined in: [types/model.ts:257](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L257)

Require specific performance characteristics

---

### requireCapability?

> `optional` **requireCapability?**: `string`

Defined in: [types/model.ts:259](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L259)

Require specific capability (reasoning, creativity, etc.)

---

### fallbackStrategy?

> `optional` **fallbackStrategy?**: `"fast"` \| `"reasoning"` \| `"auto"`

Defined in: [types/model.ts:261](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L261)

Fallback strategy if primary choice fails
