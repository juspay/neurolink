[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStructuredOutput

# Type Alias: SageMakerStructuredOutput

> **SageMakerStructuredOutput** = `object`

Defined in: [types/providers.ts:1660](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1660)

Structured output streaming information (Phase 2.3)

## Properties

### partialObject?

> `optional` **partialObject?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1662](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1662)

Partial JSON object being built

---

### jsonDelta?

> `optional` **jsonDelta?**: `string`

Defined in: [types/providers.ts:1664](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1664)

JSON delta text

---

### currentPath?

> `optional` **currentPath?**: `string`

Defined in: [types/providers.ts:1666](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1666)

Current parsing path (e.g., "user.name")

---

### validationErrors?

> `optional` **validationErrors?**: `string`[]

Defined in: [types/providers.ts:1668](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1668)

Schema validation errors

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1670](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1670)

Indicates if JSON is complete and valid

---

### schema?

> `optional` **schema?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1672](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1672)

JSON schema being validated against
