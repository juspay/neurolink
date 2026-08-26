[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SdkSimpleTool

# Type Alias: SdkSimpleTool\<TArgs, TResult\>

> **SdkSimpleTool**\<`TArgs`, `TResult`\> = `Omit`\<[`SimpleTool`](SimpleTool.md)\<`TArgs`, `TResult`\>, `"execute"`\> & `object`

Defined in: [types/tools.ts:454](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L454)

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
