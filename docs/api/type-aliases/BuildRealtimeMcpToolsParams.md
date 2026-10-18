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
The realtime model waits on the function result, so the user gets silence rather than
an error. Bounding the call turns that into a normal tool failure the
model can talk about.

---

### onToolStart?

> `optional` **onToolStart?**: (`call`) => `void`

Observes a tool call as it starts. A throwing observer never affects the call.

#### Parameters

##### call

###### name

`string`

###### args

`Record`\<`string`, `unknown`\>

###### callId?

`string`

#### Returns

`void`

---

### onToolEnd?

> `optional` **onToolEnd?**: (`call`) => `void`

Observes a tool call as it ends, with its result as text or its error.

#### Parameters

##### call

###### name

`string`

###### result?

`string`

###### error?

`string`

###### callId?

`string`

#### Returns

`void`
