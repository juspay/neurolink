[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SimpleTool

# Type Alias: SimpleTool\<TArgs, TResult\>

> **SimpleTool**\<`TArgs`, `TResult`\> = `object`

Defined in: [types/tools.ts:415](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L415)

Simple tool type (for SDK)

## Type Parameters

### TArgs

`TArgs` = [`ToolArgs`](ToolArgs.md)

### TResult

`TResult` = [`JsonValue`](JsonValue.md)

## Properties

### description

> **description**: `string`

Defined in: [types/tools.ts:416](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L416)

---

### parameters?

> `optional` **parameters?**: [`ZodUnknownSchema`](ZodUnknownSchema.md)

Defined in: [types/tools.ts:417](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L417)

---

### metadata?

> `optional` **metadata?**: [`ToolMetadata`](ToolMetadata.md)

Defined in: [types/tools.ts:418](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L418)

---

### execute

> **execute**: (`params`, `context?`) => `Promise`\<`TResult`\>

Defined in: [types/tools.ts:419](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L419)

#### Parameters

##### params

`TArgs`

##### context?

[`ToolContext`](ToolContext.md)

#### Returns

`Promise`\<`TResult`\>
