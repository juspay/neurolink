[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStructuredOutput

# Type Alias: SageMakerStructuredOutput

> **SageMakerStructuredOutput** = `object`

Defined in: [types/providers.ts:1723](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1723)

Structured output streaming information (Phase 2.3)

## Properties

### partialObject?

> `optional` **partialObject?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1725](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1725)

Partial JSON object being built

---

### jsonDelta?

> `optional` **jsonDelta?**: `string`

Defined in: [types/providers.ts:1727](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1727)

JSON delta text

---

### currentPath?

> `optional` **currentPath?**: `string`

Defined in: [types/providers.ts:1729](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1729)

Current parsing path (e.g., "user.name")

---

### validationErrors?

> `optional` **validationErrors?**: `string`[]

Defined in: [types/providers.ts:1731](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1731)

Schema validation errors

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1733](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1733)

Indicates if JSON is complete and valid

---

### schema?

> `optional` **schema?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1735](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1735)

JSON schema being validated against
