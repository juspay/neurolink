[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrantFile

# Type Alias: ProxyShareGrantFile

> **ProxyShareGrantFile** = `object`

Defined in: [types/proxy.ts:4274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4274)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4275](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4275)

---

### grants

> **grants**: `Record`\<`string`, [`ProxyShareGrant`](ProxyShareGrant.md)\>

Defined in: [types/proxy.ts:4276](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4276)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/proxy.ts:4279](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4279)

This node's stable public address, when it has one. Recorded once so
every share link is minted against it without retyping.

---

### noteSecret?

> `optional` **noteSecret?**: `string`

Defined in: [types/proxy.ts:4281](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4281)

Node-level secret coin notes are signed with. Minted on first issue.
