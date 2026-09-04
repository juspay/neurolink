[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrantFile

# Type Alias: ProxyShareGrantFile

> **ProxyShareGrantFile** = `object`

Defined in: [types/proxy.ts:3529](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3529)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3530](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3530)

---

### grants

> **grants**: `Record`\<`string`, [`ProxyShareGrant`](ProxyShareGrant.md)\>

Defined in: [types/proxy.ts:3531](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3531)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/proxy.ts:3534](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3534)

This node's stable public address, when it has one. Recorded once so
every share link is minted against it without retyping.

---

### noteSecret?

> `optional` **noteSecret?**: `string`

Defined in: [types/proxy.ts:3536](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3536)

Node-level secret coin notes are signed with. Minted on first issue.
