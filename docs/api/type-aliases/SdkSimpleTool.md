[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SdkSimpleTool

# Type Alias: SdkSimpleTool\<TArgs, TResult\>

> **SdkSimpleTool**\<`TArgs`, `TResult`\> = `Omit`\<[`SimpleTool`](SimpleTool.md)\<`TArgs`, `TResult`\>, `"execute"`\> & `object`

Defined in: [types/tools.ts:443](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L443)

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
