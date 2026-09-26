[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerVoiceWebSocketOptions

# Type Alias: ServerVoiceWebSocketOptions

> **ServerVoiceWebSocketOptions** = `object`

Options accepted by `setupWebSocket()` in `server/voice/voiceWebSocketHandler.ts`.

(Server-prefixed per CLAUDE.md Rule 9 — server-tier type. Lives in
`server.ts` rather than `cli.ts` because it configures a server-side
WebSocket upgrade handler, not CLI argument parsing.)

## Properties

### authToken?

> `optional` **authToken?**: `string`

Optional shared-secret bearer token. When set, the WebSocket upgrade
handshake must include `Authorization: Bearer <token>` or
`?token=<token>` in the URL. Without this, anyone reachable on the
network can open a session and consume Soniox / Cartesia / LLM credits.

---

### maxPayload?

> `optional` **maxPayload?**: `number`

Maximum WebSocket message size in bytes. Defaults to 1 MiB. Caps both
inbound audio frames and any client control messages — guards against
OOM via oversized uploads.
