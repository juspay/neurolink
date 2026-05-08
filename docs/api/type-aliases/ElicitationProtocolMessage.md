[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElicitationProtocolMessage

# Type Alias: ElicitationProtocolMessage

> **ElicitationProtocolMessage** = `object`

Defined in: [types/mcp.ts:1327](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1327)

Base protocol message structure

## Properties

### jsonrpc

> **jsonrpc**: `"2.0"`

Defined in: [types/mcp.ts:1328](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1328)

---

### id

> **id**: `string`

Defined in: [types/mcp.ts:1329](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1329)

---

### method

> **method**: [`ElicitationProtocolMessageType`](ElicitationProtocolMessageType.md)

Defined in: [types/mcp.ts:1330](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1330)

---

### params

> **params**: [`ElicitationRequestParams`](ElicitationRequestParams.md) \| [`ElicitationResponseParams`](ElicitationResponseParams.md) \| [`ElicitationCancelParams`](ElicitationCancelParams.md)

Defined in: [types/mcp.ts:1331](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1331)
