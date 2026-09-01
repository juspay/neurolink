[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElicitationProtocolMessage

# Type Alias: ElicitationProtocolMessage

> **ElicitationProtocolMessage** = `object`

Defined in: [types/mcp.ts:1346](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1346)

Base protocol message structure

## Properties

### jsonrpc

> **jsonrpc**: `"2.0"`

Defined in: [types/mcp.ts:1347](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1347)

---

### id

> **id**: `string`

Defined in: [types/mcp.ts:1348](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1348)

---

### method

> **method**: [`ElicitationProtocolMessageType`](ElicitationProtocolMessageType.md)

Defined in: [types/mcp.ts:1349](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1349)

---

### params

> **params**: [`ElicitationRequestParams`](ElicitationRequestParams.md) \| [`ElicitationResponseParams`](ElicitationResponseParams.md) \| [`ElicitationCancelParams`](ElicitationCancelParams.md)

Defined in: [types/mcp.ts:1350](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1350)
