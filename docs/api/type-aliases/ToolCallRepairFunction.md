[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolCallRepairFunction

# Type Alias: ToolCallRepairFunction\<TOOLS\>

> **ToolCallRepairFunction**\<`TOOLS`\> = (`options`) => `Promise`\<[`LanguageModelV3ToolCall`](LanguageModelV3ToolCall.md) \| `null`\>

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
