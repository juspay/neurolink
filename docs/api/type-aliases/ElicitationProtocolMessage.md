[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElicitationProtocolMessage

# Type Alias: ElicitationProtocolMessage

> **ElicitationProtocolMessage** = `object`

Defined in: [types/mcp.ts:1365](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1365)

Base protocol message structure

## Properties

### jsonrpc

> **jsonrpc**: `"2.0"`

Defined in: [types/mcp.ts:1366](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1366)

---

### id

> **id**: `string`

Defined in: [types/mcp.ts:1367](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1367)

---

### method

> **method**: [`ElicitationProtocolMessageType`](ElicitationProtocolMessageType.md)

Defined in: [types/mcp.ts:1368](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1368)

---

### params

> **params**: [`ElicitationRequestParams`](ElicitationRequestParams.md) \| [`ElicitationResponseParams`](ElicitationResponseParams.md) \| [`ElicitationCancelParams`](ElicitationCancelParams.md)

Defined in: [types/mcp.ts:1369](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1369)
