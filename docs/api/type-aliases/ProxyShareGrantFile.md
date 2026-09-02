[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrantFile

# Type Alias: ProxyShareGrantFile

> **ProxyShareGrantFile** = `object`

Defined in: [types/proxy.ts:3514](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3514)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3515](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3515)

---

### grants

> **grants**: `Record`\<`string`, [`ProxyShareGrant`](ProxyShareGrant.md)\>

Defined in: [types/proxy.ts:3516](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3516)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/proxy.ts:3519](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3519)

This node's stable public address, when it has one. Recorded once so
every share link is minted against it without retyping.

---

### noteSecret?

> `optional` **noteSecret?**: `string`

Defined in: [types/proxy.ts:3521](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3521)

Node-level secret coin notes are signed with. Minted on first issue.
