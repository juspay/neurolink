[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStructuredOutput

# Type Alias: SageMakerStructuredOutput

> **SageMakerStructuredOutput** = `object`

Defined in: [types/providers.ts:1623](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1623)

Structured output streaming information (Phase 2.3)

## Properties

### partialObject?

> `optional` **partialObject?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1625](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1625)

Partial JSON object being built

---

### jsonDelta?

> `optional` **jsonDelta?**: `string`

Defined in: [types/providers.ts:1627](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1627)

JSON delta text

---

### currentPath?

> `optional` **currentPath?**: `string`

Defined in: [types/providers.ts:1629](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1629)

Current parsing path (e.g., "user.name")

---

### validationErrors?

> `optional` **validationErrors?**: `string`[]

Defined in: [types/providers.ts:1631](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1631)

Schema validation errors

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1633](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1633)

Indicates if JSON is complete and valid

---

### schema?

> `optional` **schema?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1635](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1635)

JSON schema being validated against
