[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrantFile

# Type Alias: ProxyShareGrantFile

> **ProxyShareGrantFile** = `object`

Defined in: [types/proxy.ts:3867](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3867)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3868](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3868)

---

### grants

> **grants**: `Record`\<`string`, [`ProxyShareGrant`](ProxyShareGrant.md)\>

Defined in: [types/proxy.ts:3869](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3869)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/proxy.ts:3872](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3872)

This node's stable public address, when it has one. Recorded once so
every share link is minted against it without retyping.

---

### noteSecret?

> `optional` **noteSecret?**: `string`

Defined in: [types/proxy.ts:3874](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3874)

Node-level secret coin notes are signed with. Minted on first issue.
