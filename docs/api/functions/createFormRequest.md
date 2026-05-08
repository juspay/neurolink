[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createFormRequest

# Function: createFormRequest()

> **createFormRequest**(`message`, `fields`, `options`): [`ElicitationRequestMessage`](../type-aliases/ElicitationRequestMessage.md)

Defined in: [mcp/elicitationProtocol.ts:493](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitationProtocol.ts#L493)

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
