[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrantFile

# Type Alias: ProxyShareGrantFile

> **ProxyShareGrantFile** = `object`

Defined in: [types/proxy.ts:3853](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3853)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3854](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3854)

---

### grants

> **grants**: `Record`\<`string`, [`ProxyShareGrant`](ProxyShareGrant.md)\>

Defined in: [types/proxy.ts:3855](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3855)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/proxy.ts:3858](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3858)

This node's stable public address, when it has one. Recorded once so
every share link is minted against it without retyping.

---

### noteSecret?

> `optional` **noteSecret?**: `string`

Defined in: [types/proxy.ts:3860](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3860)

Node-level secret coin notes are signed with. Minted on first issue.
