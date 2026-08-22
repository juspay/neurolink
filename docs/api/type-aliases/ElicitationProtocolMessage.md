[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElicitationProtocolMessage

# Type Alias: ElicitationProtocolMessage

> **ElicitationProtocolMessage** = `object`

Defined in: [types/mcp.ts:1327](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1327)

Base protocol message structure

## Properties

### jsonrpc

> **jsonrpc**: `"2.0"`

Defined in: [types/mcp.ts:1328](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1328)

---

### id

> **id**: `string`

Defined in: [types/mcp.ts:1329](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1329)

---

### method

> **method**: [`ElicitationProtocolMessageType`](ElicitationProtocolMessageType.md)

Defined in: [types/mcp.ts:1330](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1330)

---

### params

> **params**: [`ElicitationRequestParams`](ElicitationRequestParams.md) \| [`ElicitationResponseParams`](ElicitationResponseParams.md) \| [`ElicitationCancelParams`](ElicitationCancelParams.md)

Defined in: [types/mcp.ts:1331](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1331)
