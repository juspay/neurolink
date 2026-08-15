[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createElicitationResponse

# Function: createElicitationResponse()

> **createElicitationResponse**(`requestId`, `response`): [`ElicitationResponseMessage`](../type-aliases/ElicitationResponseMessage.md)

Defined in: [mcp/elicitationProtocol.ts:69](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/elicitationProtocol.ts#L69)

Create an elicitation response protocol message

## Parameters

### requestId

`string`

### response

`Omit`\<[`ElicitationResponseParams`](../type-aliases/ElicitationResponseParams.md), `"requestId"`\>

## Returns

[`ElicitationResponseMessage`](../type-aliases/ElicitationResponseMessage.md)
