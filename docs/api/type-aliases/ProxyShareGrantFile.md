[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrantFile

# Type Alias: ProxyShareGrantFile

> **ProxyShareGrantFile** = `object`

Defined in: [types/proxy.ts:3523](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3523)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3524](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3524)

---

### grants

> **grants**: `Record`\<`string`, [`ProxyShareGrant`](ProxyShareGrant.md)\>

Defined in: [types/proxy.ts:3525](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3525)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/proxy.ts:3528](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3528)

This node's stable public address, when it has one. Recorded once so
every share link is minted against it without retyping.

---

### noteSecret?

> `optional` **noteSecret?**: `string`

Defined in: [types/proxy.ts:3530](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3530)

Node-level secret coin notes are signed with. Minted on first issue.
