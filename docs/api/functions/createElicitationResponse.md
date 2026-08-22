[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createElicitationResponse

# Function: createElicitationResponse()

> **createElicitationResponse**(`requestId`, `response`): [`ElicitationResponseMessage`](../type-aliases/ElicitationResponseMessage.md)

Defined in: [mcp/elicitationProtocol.ts:69](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/elicitationProtocol.ts#L69)

Create an elicitation response protocol message

## Parameters

### requestId

`string`

### response

`Omit`\<[`ElicitationResponseParams`](../type-aliases/ElicitationResponseParams.md), `"requestId"`\>

## Returns

[`ElicitationResponseMessage`](../type-aliases/ElicitationResponseMessage.md)
