[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolCallRepairFunction

# Type Alias: ToolCallRepairFunction\<TOOLS\>

> **ToolCallRepairFunction**\<`TOOLS`\> = (`options`) => `Promise`\<[`LanguageModelV3ToolCall`](LanguageModelV3ToolCall.md) \| `null`\>

Defined in: [types/aiCompat.ts:583](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L583)

## Type Parameters

### TOOLS

`TOOLS` _extends_ [`ToolSet`](ToolSet.md) = [`ToolSet`](ToolSet.md)

## Parameters

### options

#### system

`string` \| `undefined`

#### messages

[`ModelMessage`](ModelMessage.md)[]

#### toolCall

[`LanguageModelV3ToolCall`](LanguageModelV3ToolCall.md)

#### tools

`TOOLS`

#### inputSchema

(`options`) => `JSONSchema7`

#### error

`Error`

## Returns

`Promise`\<[`LanguageModelV3ToolCall`](LanguageModelV3ToolCall.md) \| `null`\>
