[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStructuredOutput

# Type Alias: SageMakerStructuredOutput

> **SageMakerStructuredOutput** = `object`

Defined in: [types/providers.ts:1704](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1704)

Structured output streaming information (Phase 2.3)

## Properties

### partialObject?

> `optional` **partialObject?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1706](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1706)

Partial JSON object being built

---

### jsonDelta?

> `optional` **jsonDelta?**: `string`

Defined in: [types/providers.ts:1708](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1708)

JSON delta text

---

### currentPath?

> `optional` **currentPath?**: `string`

Defined in: [types/providers.ts:1710](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1710)

Current parsing path (e.g., "user.name")

---

### validationErrors?

> `optional` **validationErrors?**: `string`[]

Defined in: [types/providers.ts:1712](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1712)

Schema validation errors

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1714](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1714)

Indicates if JSON is complete and valid

---

### schema?

> `optional` **schema?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1716](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1716)

JSON schema being validated against
