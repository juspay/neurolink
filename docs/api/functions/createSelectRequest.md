[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createSelectRequest

# Function: createSelectRequest()

> **createSelectRequest**(`message`, `selectOptions`, `options`): [`ElicitationRequestMessage`](../type-aliases/ElicitationRequestMessage.md)

Defined in: [mcp/elicitationProtocol.ts:467](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitationProtocol.ts#L467)

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
