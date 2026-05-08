[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerVoiceConnectionCtx

# Type Alias: ServerVoiceConnectionCtx

> **ServerVoiceConnectionCtx** = `object`

Defined in: [types/server.ts:1488](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1488)

Per-WebSocket-connection context object passed to the voice connection
handler. Holds shared singletons that all per-connection state derives from.

(Server-prefixed per CLAUDE.md Rule 9 — server-tier type.)

## Properties

### neurolink

> **neurolink**: [`NeuroLink`](../classes/NeuroLink.md)

Defined in: [types/server.ts:1489](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1489)

---

### accessKey

> **accessKey**: `string`

Defined in: [types/server.ts:1490](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1490)
