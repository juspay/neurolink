[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStructuredOutput

# Type Alias: SageMakerStructuredOutput

> **SageMakerStructuredOutput** = `object`

Defined in: [types/providers.ts:1622](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1622)

Structured output streaming information (Phase 2.3)

## Properties

### partialObject?

> `optional` **partialObject?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1624](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1624)

Partial JSON object being built

---

### jsonDelta?

> `optional` **jsonDelta?**: `string`

Defined in: [types/providers.ts:1626](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1626)

JSON delta text

---

### currentPath?

> `optional` **currentPath?**: `string`

Defined in: [types/providers.ts:1628](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1628)

Current parsing path (e.g., "user.name")

---

### validationErrors?

> `optional` **validationErrors?**: `string`[]

Defined in: [types/providers.ts:1630](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1630)

Schema validation errors

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1632](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1632)

Indicates if JSON is complete and valid

---

### schema?

> `optional` **schema?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1634](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1634)

JSON schema being validated against
