[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createFormRequest

# Function: createFormRequest()

> **createFormRequest**(`message`, `fields`, `options`): [`ElicitationRequestMessage`](../type-aliases/ElicitationRequestMessage.md)

Defined in: [mcp/elicitationProtocol.ts:493](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/elicitationProtocol.ts#L493)

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
