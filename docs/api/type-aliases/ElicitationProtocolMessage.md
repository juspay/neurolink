[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElicitationProtocolMessage

# Type Alias: ElicitationProtocolMessage

> **ElicitationProtocolMessage** = `object`

Base protocol message structure

## Properties

### jsonrpc

> **jsonrpc**: `"2.0"`

---

### id

> **id**: `string`

---

### method

> **method**: [`ElicitationProtocolMessageType`](ElicitationProtocolMessageType.md)

---

### params

> **params**: [`ElicitationRequestParams`](ElicitationRequestParams.md) \| [`ElicitationResponseParams`](ElicitationResponseParams.md) \| [`ElicitationCancelParams`](ElicitationCancelParams.md)
