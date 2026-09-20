[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStructuredOutput

# Type Alias: SageMakerStructuredOutput

> **SageMakerStructuredOutput** = `object`

Defined in: [types/providers.ts:1696](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1696)

Structured output streaming information (Phase 2.3)

## Properties

### partialObject?

> `optional` **partialObject?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1698](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1698)

Partial JSON object being built

---

### jsonDelta?

> `optional` **jsonDelta?**: `string`

Defined in: [types/providers.ts:1700](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1700)

JSON delta text

---

### currentPath?

> `optional` **currentPath?**: `string`

Defined in: [types/providers.ts:1702](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1702)

Current parsing path (e.g., "user.name")

---

### validationErrors?

> `optional` **validationErrors?**: `string`[]

Defined in: [types/providers.ts:1704](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1704)

Schema validation errors

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1706](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1706)

Indicates if JSON is complete and valid

---

### schema?

> `optional` **schema?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1708](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1708)

JSON schema being validated against
