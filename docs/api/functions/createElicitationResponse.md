[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createElicitationResponse

# Function: createElicitationResponse()

> **createElicitationResponse**(`requestId`, `response`): [`ElicitationResponseMessage`](../type-aliases/ElicitationResponseMessage.md)

Defined in: [mcp/elicitationProtocol.ts:69](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitationProtocol.ts#L69)

Create an elicitation response protocol message

## Parameters

### requestId

`string`

### response

`Omit`\<[`ElicitationResponseParams`](../type-aliases/ElicitationResponseParams.md), `"requestId"`\>

## Returns

[`ElicitationResponseMessage`](../type-aliases/ElicitationResponseMessage.md)
