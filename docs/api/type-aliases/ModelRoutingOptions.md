[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelRoutingOptions

# Type Alias: ModelRoutingOptions

> **ModelRoutingOptions** = `object`

Defined in: [types/model.ts:261](https://github.com/juspay/neurolink/blob/release/src/lib/types/model.ts#L261)

## Properties

### forceTaskType?

> `optional` **forceTaskType?**: [`TaskType`](TaskType.md)

Defined in: [types/model.ts:263](https://github.com/juspay/neurolink/blob/release/src/lib/types/model.ts#L263)

Override the task classification

---

### requireFast?

> `optional` **requireFast?**: `boolean`

Defined in: [types/model.ts:265](https://github.com/juspay/neurolink/blob/release/src/lib/types/model.ts#L265)

Require specific performance characteristics

---

### requireCapability?

> `optional` **requireCapability?**: `string`

Defined in: [types/model.ts:267](https://github.com/juspay/neurolink/blob/release/src/lib/types/model.ts#L267)

Require specific capability (reasoning, creativity, etc.)

---

### fallbackStrategy?

> `optional` **fallbackStrategy?**: `"fast"` \| `"reasoning"` \| `"auto"`

Defined in: [types/model.ts:269](https://github.com/juspay/neurolink/blob/release/src/lib/types/model.ts#L269)

Fallback strategy if primary choice fails
