[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerVoiceWebSocketOptions

# Type Alias: ServerVoiceWebSocketOptions

> **ServerVoiceWebSocketOptions** = `object`

Defined in: [types/server.ts:1538](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1538)

Options accepted by `setupWebSocket()` in `server/voice/voiceWebSocketHandler.ts`.

(Server-prefixed per CLAUDE.md Rule 9 — server-tier type. Lives in
`server.ts` rather than `cli.ts` because it configures a server-side
WebSocket upgrade handler, not CLI argument parsing.)

## Properties

### authToken?

> `optional` **authToken?**: `string`

Defined in: [types/server.ts:1545](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1545)

Optional shared-secret bearer token. When set, the WebSocket upgrade
handshake must include `Authorization: Bearer <token>` or
`?token=<token>` in the URL. Without this, anyone reachable on the
network can open a session and consume Soniox / Cartesia / LLM credits.

---

### maxPayload?

> `optional` **maxPayload?**: `number`

Defined in: [types/server.ts:1551](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1551)

Maximum WebSocket message size in bytes. Defaults to 1 MiB. Caps both
inbound audio frames and any client control messages — guards against
OOM via oversized uploads.
