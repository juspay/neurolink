[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createSelectRequest

# Function: createSelectRequest()

> **createSelectRequest**(`message`, `selectOptions`, `options`): [`ElicitationRequestMessage`](../type-aliases/ElicitationRequestMessage.md)

Defined in: [mcp/elicitationProtocol.ts:467](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/elicitationProtocol.ts#L467)

Create protocol-compliant select request

## Parameters

### message

`string`

### selectOptions

[`SelectOption`](../type-aliases/SelectOption.md)[]

### options

#### toolName

`string`

#### serverId?

`string`

#### defaultValue?

`string`

#### timeout?

`number`

## Returns

[`ElicitationRequestMessage`](../type-aliases/ElicitationRequestMessage.md)
