[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStructuredOutput

# Type Alias: SageMakerStructuredOutput

> **SageMakerStructuredOutput** = `object`

Defined in: [types/providers.ts:1643](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1643)

Structured output streaming information (Phase 2.3)

## Properties

### partialObject?

> `optional` **partialObject?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1645](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1645)

Partial JSON object being built

---

### jsonDelta?

> `optional` **jsonDelta?**: `string`

Defined in: [types/providers.ts:1647](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1647)

JSON delta text

---

### currentPath?

> `optional` **currentPath?**: `string`

Defined in: [types/providers.ts:1649](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1649)

Current parsing path (e.g., "user.name")

---

### validationErrors?

> `optional` **validationErrors?**: `string`[]

Defined in: [types/providers.ts:1651](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1651)

Schema validation errors

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1653](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1653)

Indicates if JSON is complete and valid

---

### schema?

> `optional` **schema?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1655](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1655)

JSON schema being validated against
