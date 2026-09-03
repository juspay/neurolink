[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Tool

# Type Alias: Tool\<INPUT, OUTPUT\>

> **Tool**\<`INPUT`, `OUTPUT`\> = `object` & `ToolOutputProperties`\<`INPUT`, `OUTPUT`\> & `object` & \{ `type?`: `"function"`; \} \| \{ `type`: `"dynamic"`; \} \| \{ `type`: `"provider"`; `id`: `` `${string}.${string}` ``; `args`: `Record`\<`string`, `unknown`\>; `supportsDeferredResults?`: `boolean`; \}

Defined in: [types/aiCompat.ts:127](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L127)

## Type Declaration

### description?

> `optional` **description?**: `string`

### title?

> `optional` **title?**: `string`

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>

### inputSchema

> **inputSchema**: [`FlexibleSchema`](FlexibleSchema.md)\<`INPUT`\>

### inputExamples?

> `optional` **inputExamples?**: `object`[]

### needsApproval?

> `optional` **needsApproval?**: `boolean` \| `ToolNeedsApprovalFunction`\<`INPUT`\>

### strict?

> `optional` **strict?**: `boolean`

### onInputStart?

> `optional` **onInputStart?**: (`options`) => `void` \| `PromiseLike`\<`void`\>

#### Parameters

##### options

`ToolCallOptions`

#### Returns

`void` \| `PromiseLike`\<`void`\>

### onInputDelta?

> `optional` **onInputDelta?**: (`options`) => `void` \| `PromiseLike`\<`void`\>

#### Parameters

##### options

`object` & `ToolCallOptions`

#### Returns

`void` \| `PromiseLike`\<`void`\>

### onInputAvailable?

> `optional` **onInputAvailable?**: (`options`) => `void` \| `PromiseLike`\<`void`\>

#### Parameters

##### options

`object` & `ToolCallOptions`

#### Returns

`void` \| `PromiseLike`\<`void`\>

## Type Declaration

### toModelOutput?

> `optional` **toModelOutput?**: (`options`) => `unknown` \| `PromiseLike`\<`unknown`\>

#### Parameters

##### options

###### toolCallId

`string`

###### input

`INPUT`

###### output

`OUTPUT`

#### Returns

`unknown` \| `PromiseLike`\<`unknown`\>

## Type Parameters

### INPUT

`INPUT` = `any`

### OUTPUT

`OUTPUT` = `any`
