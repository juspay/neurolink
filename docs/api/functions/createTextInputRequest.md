[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createTextInputRequest

# Function: createTextInputRequest()

> **createTextInputRequest**(`message`, `options`): [`ElicitationRequestMessage`](../type-aliases/ElicitationRequestMessage.md)

Defined in: [mcp/elicitationProtocol.ts:422](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/mcp/elicitationProtocol.ts#L422)

Create protocol-compliant text input request

## Parameters

### message

`string`

### options

#### toolName

`string`

#### serverId?

`string`

#### placeholder?

`string`

#### defaultValue?

`string`

#### minLength?

`number`

#### maxLength?

`number`

#### pattern?

`string`

#### multiline?

`boolean`

#### timeout?

`number`

## Returns

[`ElicitationRequestMessage`](../type-aliases/ElicitationRequestMessage.md)
