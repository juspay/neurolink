[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStructuredOutput

# Type Alias: SageMakerStructuredOutput

> **SageMakerStructuredOutput** = `object`

Defined in: [types/providers.ts:1635](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1635)

Structured output streaming information (Phase 2.3)

## Properties

### partialObject?

> `optional` **partialObject?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1637](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1637)

Partial JSON object being built

---

### jsonDelta?

> `optional` **jsonDelta?**: `string`

Defined in: [types/providers.ts:1639](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1639)

JSON delta text

---

### currentPath?

> `optional` **currentPath?**: `string`

Defined in: [types/providers.ts:1641](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1641)

Current parsing path (e.g., "user.name")

---

### validationErrors?

> `optional` **validationErrors?**: `string`[]

Defined in: [types/providers.ts:1643](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1643)

Schema validation errors

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1645](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1645)

Indicates if JSON is complete and valid

---

### schema?

> `optional` **schema?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1647](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1647)

JSON schema being validated against
