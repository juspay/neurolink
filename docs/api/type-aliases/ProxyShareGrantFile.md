[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrantFile

# Type Alias: ProxyShareGrantFile

> **ProxyShareGrantFile** = `object`

Defined in: [types/proxy.ts:3530](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3530)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3531](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3531)

---

### grants

> **grants**: `Record`\<`string`, [`ProxyShareGrant`](ProxyShareGrant.md)\>

Defined in: [types/proxy.ts:3532](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3532)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/proxy.ts:3535](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3535)

This node's stable public address, when it has one. Recorded once so
every share link is minted against it without retyping.

---

### noteSecret?

> `optional` **noteSecret?**: `string`

Defined in: [types/proxy.ts:3537](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3537)

Node-level secret coin notes are signed with. Minted on first issue.
