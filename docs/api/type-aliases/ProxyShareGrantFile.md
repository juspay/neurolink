[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrantFile

# Type Alias: ProxyShareGrantFile

> **ProxyShareGrantFile** = `object`

Defined in: [types/proxy.ts:4264](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4264)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4265](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4265)

---

### grants

> **grants**: `Record`\<`string`, [`ProxyShareGrant`](ProxyShareGrant.md)\>

Defined in: [types/proxy.ts:4266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4266)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/proxy.ts:4269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4269)

This node's stable public address, when it has one. Recorded once so
every share link is minted against it without retyping.

---

### noteSecret?

> `optional` **noteSecret?**: `string`

Defined in: [types/proxy.ts:4271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4271)

Node-level secret coin notes are signed with. Minted on first issue.
