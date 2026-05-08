[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SdkSimpleTool

# Type Alias: SdkSimpleTool\<TArgs, TResult\>

> **SdkSimpleTool**\<`TArgs`, `TResult`\> = `Omit`\<[`SimpleTool`](SimpleTool.md)\<`TArgs`, `TResult`\>, `"execute"`\> & `object`

Defined in: [types/tools.ts:426](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L426)

Simple tool type accepted by the SDK registerTool() helper. Uses
SDKToolContext (richer tool context with request metadata).

## Type Declaration

### description

> **description**: `string`

### parameters?

> `optional` **parameters?**: [`ZodUnknownSchema`](ZodUnknownSchema.md)

### execute

> **execute**: (`params`, `context?`) => `Promise`\<`TResult`\>

#### Parameters

##### params

`TArgs`

##### context?

[`SDKToolContext`](SDKToolContext.md)

#### Returns

`Promise`\<`TResult`\>

### metadata?

> `optional` **metadata?**: `object`

#### Index Signature

\[`key`: `string`\]: [`JsonValue`](JsonValue.md) \| `undefined`

#### metadata.category?

> `optional` **category?**: `string`

#### metadata.version?

> `optional` **version?**: `string`

#### metadata.author?

> `optional` **author?**: `string`

#### metadata.tags?

> `optional` **tags?**: `string`[]

#### metadata.documentation?

> `optional` **documentation?**: `string`

## Type Parameters

### TArgs

`TArgs` = [`ToolArgs`](ToolArgs.md)

### TResult

`TResult` = [`JsonValue`](JsonValue.md)
