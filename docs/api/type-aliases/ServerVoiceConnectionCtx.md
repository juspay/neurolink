[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerVoiceConnectionCtx

# Type Alias: ServerVoiceConnectionCtx

> **ServerVoiceConnectionCtx** = `object`

Defined in: [types/server.ts:1501](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1501)

Per-WebSocket-connection context object passed to the voice connection
handler. Holds shared singletons that all per-connection state derives from.

(Server-prefixed per CLAUDE.md Rule 9 — server-tier type.)

## Properties

### neurolink

> **neurolink**: [`NeuroLink`](../classes/NeuroLink.md)

Defined in: [types/server.ts:1502](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1502)

---

### accessKey

> **accessKey**: `string`

Defined in: [types/server.ts:1503](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1503)
