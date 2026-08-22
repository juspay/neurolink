[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createFormRequest

# Function: createFormRequest()

> **createFormRequest**(`message`, `fields`, `options`): [`ElicitationRequestMessage`](../type-aliases/ElicitationRequestMessage.md)

Defined in: [mcp/elicitationProtocol.ts:493](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/mcp/elicitationProtocol.ts#L493)

Create protocol-compliant form request

## Parameters

### message

`string`

### fields

[`FormField`](../type-aliases/FormField.md)[]

### options

#### toolName

`string`

#### serverId?

`string`

#### submitLabel?

`string`

#### timeout?

`number`

## Returns

[`ElicitationRequestMessage`](../type-aliases/ElicitationRequestMessage.md)
