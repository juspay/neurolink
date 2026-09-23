[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrantFile

# Type Alias: ProxyShareGrantFile

> **ProxyShareGrantFile** = `object`

Defined in: [types/proxy.ts:4119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4119)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4120)

---

### grants

> **grants**: `Record`\<`string`, [`ProxyShareGrant`](ProxyShareGrant.md)\>

Defined in: [types/proxy.ts:4121](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4121)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/proxy.ts:4124](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4124)

This node's stable public address, when it has one. Recorded once so
every share link is minted against it without retyping.

---

### noteSecret?

> `optional` **noteSecret?**: `string`

Defined in: [types/proxy.ts:4126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4126)

Node-level secret coin notes are signed with. Minted on first issue.
