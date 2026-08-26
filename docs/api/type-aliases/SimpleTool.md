[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SimpleTool

# Type Alias: SimpleTool\<TArgs, TResult\>

> **SimpleTool**\<`TArgs`, `TResult`\> = `object`

Defined in: [types/tools.ts:443](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L443)

Simple tool type (for SDK)

## Type Parameters

### TArgs

`TArgs` = [`ToolArgs`](ToolArgs.md)

### TResult

`TResult` = [`JsonValue`](JsonValue.md)

## Properties

### description

> **description**: `string`

Defined in: [types/tools.ts:444](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L444)

---

### parameters?

> `optional` **parameters?**: [`ZodUnknownSchema`](ZodUnknownSchema.md)

Defined in: [types/tools.ts:445](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L445)

---

### metadata?

> `optional` **metadata?**: [`ToolMetadata`](ToolMetadata.md)

Defined in: [types/tools.ts:446](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L446)

---

### execute

> **execute**: (`params`, `context?`) => `Promise`\<`TResult`\>

Defined in: [types/tools.ts:447](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L447)

#### Parameters

##### params

`TArgs`

##### context?

[`ToolContext`](ToolContext.md)

#### Returns

`Promise`\<`TResult`\>
