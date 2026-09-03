[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SimpleTool

# Type Alias: SimpleTool\<TArgs, TResult\>

> **SimpleTool**\<`TArgs`, `TResult`\> = `object`

Defined in: [types/tools.ts:466](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L466)

Simple tool type (for SDK)

## Type Parameters

### TArgs

`TArgs` = [`ToolArgs`](ToolArgs.md)

### TResult

`TResult` = [`JsonValue`](JsonValue.md)

## Properties

### description

> **description**: `string`

Defined in: [types/tools.ts:467](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L467)

---

### parameters?

> `optional` **parameters?**: [`ZodUnknownSchema`](ZodUnknownSchema.md)

Defined in: [types/tools.ts:468](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L468)

---

### metadata?

> `optional` **metadata?**: [`ToolMetadata`](ToolMetadata.md)

Defined in: [types/tools.ts:469](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L469)

---

### execute

> **execute**: (`params`, `context?`) => `Promise`\<`TResult`\>

Defined in: [types/tools.ts:470](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L470)

#### Parameters

##### params

`TArgs`

##### context?

[`ToolContext`](ToolContext.md)

#### Returns

`Promise`\<`TResult`\>
