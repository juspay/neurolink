[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStructuredOutput

# Type Alias: SageMakerStructuredOutput

> **SageMakerStructuredOutput** = `object`

Defined in: [types/providers.ts:1716](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1716)

Structured output streaming information (Phase 2.3)

## Properties

### partialObject?

> `optional` **partialObject?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1718](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1718)

Partial JSON object being built

---

### jsonDelta?

> `optional` **jsonDelta?**: `string`

Defined in: [types/providers.ts:1720](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1720)

JSON delta text

---

### currentPath?

> `optional` **currentPath?**: `string`

Defined in: [types/providers.ts:1722](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1722)

Current parsing path (e.g., "user.name")

---

### validationErrors?

> `optional` **validationErrors?**: `string`[]

Defined in: [types/providers.ts:1724](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1724)

Schema validation errors

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1726](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1726)

Indicates if JSON is complete and valid

---

### schema?

> `optional` **schema?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1728](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1728)

JSON schema being validated against
