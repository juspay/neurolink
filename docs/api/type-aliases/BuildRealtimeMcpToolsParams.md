[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BuildRealtimeMcpToolsParams

# Type Alias: BuildRealtimeMcpToolsParams

> **BuildRealtimeMcpToolsParams** = `object`

Inputs to `buildRealtimeMcpTools`.

## Properties

### mcpUrl

> **mcpUrl**: `string`

Full URL of the MCP server (e.g. ".../ai/mcp/v2").

---

### authToken

> **authToken**: `string`

Lighthouse access JWT forwarded as `x-auth-token`.

---

### xContext

> **xContext**: `string`

base64(JSON) execution context forwarded as `x-context`.

---

### publishEvent

> **publishEvent**: [`RealtimeEventPublisher`](RealtimeEventPublisher.md)

Publishes tool start/result events to the browser.

---

### requestConfirmation

> **requestConfirmation**: [`RealtimeConfirmationRequester`](RealtimeConfirmationRequester.md)

Opens a HITL confirmation for destructive tools and awaits the decision.

---

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number`

Hard cap per MCP tool call, in milliseconds (default 30000).

Without one, a stalled MCP server holds the realtime turn open forever:
Gemini waits on the function result, so the user gets silence rather than
an error. Bounding the call turns that into a normal tool failure the
model can talk about.
