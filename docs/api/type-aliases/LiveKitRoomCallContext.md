[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitRoomCallContext

# Type Alias: LiveKitRoomCallContext

> **LiveKitRoomCallContext** = `object`

Auth token + base64 MCP execution context decoded from a room's metadata.

## Properties

### authToken

> **authToken**: `string`

Lighthouse access JWT used as `x-auth-token` to the MCP server.

---

### xContext

> **xContext**: `string`

base64(JSON) MCP execution context used as `x-context` (or "" if absent).
