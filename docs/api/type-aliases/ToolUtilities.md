[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolUtilities

# Type Alias: ToolUtilities

> **ToolUtilities** = `object`

Utility functions for tool management.

## Properties

### isZodSchema?

> `optional` **isZodSchema?**: (`schema`) => `boolean`

#### Parameters

##### schema

`unknown`

#### Returns

`boolean`

---

### convertToolResult?

> `optional` **convertToolResult?**: (`result`) => `Promise`\<`unknown`\>

#### Parameters

##### result

`unknown`

#### Returns

`Promise`\<`unknown`\>

---

### createPermissiveZodSchema?

> `optional` **createPermissiveZodSchema?**: () => `z.ZodSchema`

#### Returns

`z.ZodSchema`

---

### fixSchemaForOpenAIStrictMode?

> `optional` **fixSchemaForOpenAIStrictMode?**: (`schema`) => `Record`\<`string`, `unknown`\>

#### Parameters

##### schema

`Record`\<`string`, `unknown`\>

#### Returns

`Record`\<`string`, `unknown`\>
