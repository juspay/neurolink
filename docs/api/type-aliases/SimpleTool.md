[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SimpleTool

# Type Alias: SimpleTool\<TArgs, TResult\>

> **SimpleTool**\<`TArgs`, `TResult`\> = `object`

Simple tool type (for SDK)

## Type Parameters

### TArgs

`TArgs` = [`ToolArgs`](ToolArgs.md)

### TResult

`TResult` = [`JsonValue`](JsonValue.md)

## Properties

### description

> **description**: `string`

---

### parameters?

> `optional` **parameters?**: [`ZodUnknownSchema`](ZodUnknownSchema.md)

---

### metadata?

> `optional` **metadata?**: [`ToolMetadata`](ToolMetadata.md)

---

### execute

> **execute**: (`params`, `context?`) => `Promise`\<`TResult`\>

#### Parameters

##### params

`TArgs`

##### context?

[`ToolContext`](ToolContext.md)

#### Returns

`Promise`\<`TResult`\>
