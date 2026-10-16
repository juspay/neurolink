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
