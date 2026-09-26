[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrantFile

# Type Alias: ProxyShareGrantFile

> **ProxyShareGrantFile** = `object`

Defined in: [types/proxy.ts:4214](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4214)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4215](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4215)

---

### grants

> **grants**: `Record`\<`string`, [`ProxyShareGrant`](ProxyShareGrant.md)\>

Defined in: [types/proxy.ts:4216](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4216)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/proxy.ts:4219](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4219)

This node's stable public address, when it has one. Recorded once so
every share link is minted against it without retyping.

---

### noteSecret?

> `optional` **noteSecret?**: `string`

Defined in: [types/proxy.ts:4221](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4221)

Node-level secret coin notes are signed with. Minted on first issue.
