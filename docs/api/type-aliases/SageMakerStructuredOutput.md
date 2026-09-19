[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStructuredOutput

# Type Alias: SageMakerStructuredOutput

> **SageMakerStructuredOutput** = `object`

Defined in: [types/providers.ts:1697](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1697)

Structured output streaming information (Phase 2.3)

## Properties

### partialObject?

> `optional` **partialObject?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1699](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1699)

Partial JSON object being built

---

### jsonDelta?

> `optional` **jsonDelta?**: `string`

Defined in: [types/providers.ts:1701](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1701)

JSON delta text

---

### currentPath?

> `optional` **currentPath?**: `string`

Defined in: [types/providers.ts:1703](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1703)

Current parsing path (e.g., "user.name")

---

### validationErrors?

> `optional` **validationErrors?**: `string`[]

Defined in: [types/providers.ts:1705](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1705)

Schema validation errors

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1707](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1707)

Indicates if JSON is complete and valid

---

### schema?

> `optional` **schema?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1709](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1709)

JSON schema being validated against
