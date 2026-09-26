[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WebSocketRequestId

# Type Alias: WebSocketRequestId

> **WebSocketRequestId** = `string` \| `number`

Client-supplied correlation id on an agent-protocol WebSocket message
(`{ type, payload, id }`). Echoed back on the matching response frame so a
caller with more than one in-flight message on a connection can tell which
frame answers which request; optional and ignored entirely by a client
that never sends one.
