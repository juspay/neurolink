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

Token(s) required on the upgrade, as `Authorization: Bearer <token>` or,
for a browser (which cannot set headers), as the subprotocol
`neurolink-api-key.<token>` offered next to `neurolink` in
`Sec-WebSocket-Protocol` (the realtime path also takes OpenAI's
`openai-insecure-api-key.<token>`). `neurolink serve` passes the same keys
as its HTTP routes (`NEUROLINK_SERVER_API_KEY`, comma-separated), so one
setting guards both.

---

### allowQueryToken?

> `optional` **allowQueryToken?**: `boolean`

Also accept the token as `?token=<token>` in the upgrade URL (default:
`false`). A URL is written to access logs, proxies and `Referer` headers,
so a key carried there leaks; prefer the subprotocol carrier.

---

### maxConnections?

> `optional` **maxConnections?**: `number`

Most sockets open at once across every path this attaches (default 100).
A further upgrade is answered `503 Service Unavailable` before the
handshake, so it costs no transcription engine.

---

### maxConnectionsPerAddress?

> `optional` **maxConnectionsPerAddress?**: `number`

Most sockets open at once from one remote address (default 16); the next is answered 503.

---

### highWaterMark?

> `optional` **highWaterMark?**: `number`

Queued audio bytes per socket above which the socket is paused until the
engine catches up (TCP backpressure; default 8 MiB). Audio beyond
`maxQueuedBytes` (16 MiB live, 512 MiB in file mode) still closes the
socket with 1009.

---

### maxTotalQueuedBytes?

> `optional` **maxTotalQueuedBytes?**: `number`

Queued audio bytes across every socket of this process (default 512 MiB).
A socket whose frame would push the total past it is closed with 1013
(try again later), so one burst of uploads cannot take the process down.

---

### allowUnauthenticatedFileMode?

> `optional` **allowUnauthenticatedFileMode?**: `boolean`

Serve `mode: "file"` (whole recordings, buffered up to 512 MiB a socket)
to callers the server has not authenticated while it listens on a
non-loopback address (default: `false`, such a request is refused with
1008). With `authToken` set, or on a loopback listener, file mode is open.

---

### requireSessionSecret?

> `optional` **requireSessionSecret?**: `boolean`

Require a session secret (default: `false`). A speaker that opens a
session may pass `?secret=<value>`; from then on every speaker and
listener joining that `?session=` must present the same secret, or is
refused with 1008. `true` refuses a new session that sets no secret, so
no session can be joined by guessing its id.

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

---

### subscribePath?

> `optional` **subscribePath?**: `string` \| `false`

Listener path of transcription sessions: a socket here reads one
session's speakers in its own languages. Default `<path>/subscribe`;
`false` turns sessions off (a `?session=` on the stream path is then
ignored).

---

### realtimePath?

> `optional` **realtimePath?**: `string` \| `false`

OpenAI Realtime transcription path (`?intent=transcription`): the
protocol of OpenAI's `/v1/realtime`, so any OpenAI-Realtime client — the
LiveKit `openai.STT(use_realtime=True)` plugin, Pipecat, the OpenAI SDK —
streams to NeuroLink with no adapter. Default `/v1/realtime`; `false`
turns it off.

---

### realtimeProfiles?

> `optional` **realtimeProfiles?**: `Readonly`\<`Record`\<`string`, [`ServerSTTRealtimeProfile`](ServerSTTRealtimeProfile.md)\>\>

Profiles a realtime client selects with its `model` name. Merged over
`NEUROLINK_STT_REALTIME_PROFILES` (a JSON object of the same shape);
these win on a name in both.
