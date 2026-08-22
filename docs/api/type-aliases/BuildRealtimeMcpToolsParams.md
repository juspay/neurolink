[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BuildRealtimeMcpToolsParams

# Type Alias: BuildRealtimeMcpToolsParams

> **BuildRealtimeMcpToolsParams** = `object`

Defined in: [types/livekit.ts:545](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L545)

Inputs to `buildRealtimeMcpTools`.

## Properties

### mcpUrl

> **mcpUrl**: `string`

Defined in: [types/livekit.ts:547](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L547)

Full URL of the MCP server (e.g. ".../ai/mcp/v2").

---

### authToken

> **authToken**: `string`

Defined in: [types/livekit.ts:549](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L549)

Lighthouse access JWT forwarded as `x-auth-token`.

---

### xContext

> **xContext**: `string`

Defined in: [types/livekit.ts:551](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L551)

base64(JSON) execution context forwarded as `x-context`.

---

### publishEvent

> **publishEvent**: [`RealtimeEventPublisher`](RealtimeEventPublisher.md)

Defined in: [types/livekit.ts:553](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L553)

Publishes tool start/result events to the browser.

---

### requestConfirmation

> **requestConfirmation**: [`RealtimeConfirmationRequester`](RealtimeConfirmationRequester.md)

Defined in: [types/livekit.ts:555](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L555)

Opens a HITL confirmation for destructive tools and awaits the decision.

---

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number`

Defined in: [types/livekit.ts:564](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L564)

Hard cap per MCP tool call, in milliseconds (default 30000).

Without one, a stalled MCP server holds the realtime turn open forever:
Gemini waits on the function result, so the user gets silence rather than
an error. Bounding the call turns that into a normal tool failure the
model can talk about.
