[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolUtilities

# Type Alias: ToolUtilities

> **ToolUtilities** = `object`

Defined in: [types/common.ts:469](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L469)

Utility functions for tool management.

## Properties

### isZodSchema?

> `optional` **isZodSchema?**: (`schema`) => `boolean`

Defined in: [types/common.ts:470](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L470)

#### Parameters

##### schema

`unknown`

#### Returns

`boolean`

---

### convertToolResult?

> `optional` **convertToolResult?**: (`result`) => `Promise`\<`unknown`\>

Defined in: [types/common.ts:471](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L471)

#### Parameters

##### result

`unknown`

#### Returns

`Promise`\<`unknown`\>

---

### createPermissiveZodSchema?

> `optional` **createPermissiveZodSchema?**: () => `z.ZodSchema`

Defined in: [types/common.ts:472](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L472)

#### Returns

`z.ZodSchema`

---

### fixSchemaForOpenAIStrictMode?

> `optional` **fixSchemaForOpenAIStrictMode?**: (`schema`) => `Record`\<`string`, `unknown`\>

Defined in: [types/common.ts:473](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L473)

#### Parameters

##### schema

`Record`\<`string`, `unknown`\>

#### Returns

`Record`\<`string`, `unknown`\>
