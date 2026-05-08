[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolUtilities

# Type Alias: ToolUtilities

> **ToolUtilities** = `object`

Defined in: [types/common.ts:439](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L439)

Utility functions for tool management.

## Properties

### isZodSchema?

> `optional` **isZodSchema?**: (`schema`) => `boolean`

Defined in: [types/common.ts:440](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L440)

#### Parameters

##### schema

`unknown`

#### Returns

`boolean`

---

### convertToolResult?

> `optional` **convertToolResult?**: (`result`) => `Promise`\<`unknown`\>

Defined in: [types/common.ts:441](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L441)

#### Parameters

##### result

`unknown`

#### Returns

`Promise`\<`unknown`\>

---

### createPermissiveZodSchema?

> `optional` **createPermissiveZodSchema?**: () => `z.ZodSchema`

Defined in: [types/common.ts:442](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L442)

#### Returns

`z.ZodSchema`

---

### fixSchemaForOpenAIStrictMode?

> `optional` **fixSchemaForOpenAIStrictMode?**: (`schema`) => `Record`\<`string`, `unknown`\>

Defined in: [types/common.ts:443](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L443)

#### Parameters

##### schema

`Record`\<`string`, `unknown`\>

#### Returns

`Record`\<`string`, `unknown`\>
