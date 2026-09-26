[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WebSocketRequestId

# Type Alias: WebSocketRequestId

> **WebSocketRequestId** = `string` \| `number`

Defined in: [types/server.ts:928](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L928)

Client-supplied correlation id on an agent-protocol WebSocket message
(`{ type, payload, id }`). Echoed back on the matching response frame so a
caller with more than one in-flight message on a connection can tell which
frame answers which request; optional and ignored entirely by a client
that never sends one.
