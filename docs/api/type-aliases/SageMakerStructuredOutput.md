[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStructuredOutput

# Type Alias: SageMakerStructuredOutput

> **SageMakerStructuredOutput** = `object`

Defined in: [types/providers.ts:1640](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1640)

Structured output streaming information (Phase 2.3)

## Properties

### partialObject?

> `optional` **partialObject?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1642](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1642)

Partial JSON object being built

---

### jsonDelta?

> `optional` **jsonDelta?**: `string`

Defined in: [types/providers.ts:1644](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1644)

JSON delta text

---

### currentPath?

> `optional` **currentPath?**: `string`

Defined in: [types/providers.ts:1646](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1646)

Current parsing path (e.g., "user.name")

---

### validationErrors?

> `optional` **validationErrors?**: `string`[]

Defined in: [types/providers.ts:1648](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1648)

Schema validation errors

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1650](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1650)

Indicates if JSON is complete and valid

---

### schema?

> `optional` **schema?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1652](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1652)

JSON schema being validated against
