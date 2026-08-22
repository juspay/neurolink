[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitRoomCallContext

# Type Alias: LiveKitRoomCallContext

> **LiveKitRoomCallContext** = `object`

Defined in: [types/livekit.ts:501](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L501)

Auth token + base64 MCP execution context decoded from a room's metadata.

## Properties

### authToken

> **authToken**: `string`

Defined in: [types/livekit.ts:503](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L503)

Lighthouse access JWT used as `x-auth-token` to the MCP server.

---

### xContext

> **xContext**: `string`

Defined in: [types/livekit.ts:505](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L505)

base64(JSON) MCP execution context used as `x-context` (or "" if absent).
