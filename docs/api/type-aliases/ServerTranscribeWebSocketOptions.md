[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerTranscribeWebSocketOptions

# Type Alias: ServerTranscribeWebSocketOptions

> **ServerTranscribeWebSocketOptions** = `object`

Options for `attachTranscribeWebSocket()`.

## Properties

### path?

> `optional` **path?**: `string`

Upgrade path. Default `/v1/audio/transcriptions/stream`.

---

### authToken?

> `optional` **authToken?**: `string` \| readonly `string`[]

Token(s) required on the upgrade (`Authorization: Bearer` header or
`?token=`). `neurolink serve` passes the same keys as its HTTP routes
(`NEUROLINK_SERVER_API_KEY`, comma-separated), so one setting guards both.

---

### allowedOrigins?

> `optional` **allowedOrigins?**: readonly `string`[]

Browser origins allowed to upgrade. A browser always sends `Origin` on a
WebSocket upgrade, and an upgrade whose `Origin` is not listed is refused
with 403; a request without the header (a non-browser client) is let
through, as CORS does not apply to it. Omitted, or containing `"*"`, means
any origin. `neurolink serve` passes its `cors.origins` here so one
allow-list covers the HTTP routes and the stream.

---

### maxPayload?

> `optional` **maxPayload?**: `number`

Largest single frame, in bytes. Default 1 MiB.
