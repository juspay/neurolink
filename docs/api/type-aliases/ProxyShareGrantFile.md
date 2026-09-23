[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrantFile

# Type Alias: ProxyShareGrantFile

> **ProxyShareGrantFile** = `object`

Defined in: [types/proxy.ts:4139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4139)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4140](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4140)

---

### grants

> **grants**: `Record`\<`string`, [`ProxyShareGrant`](ProxyShareGrant.md)\>

Defined in: [types/proxy.ts:4141](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4141)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/proxy.ts:4144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4144)

This node's stable public address, when it has one. Recorded once so
every share link is minted against it without retyping.

---

### noteSecret?

> `optional` **noteSecret?**: `string`

Defined in: [types/proxy.ts:4146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4146)

Node-level secret coin notes are signed with. Minted on first issue.
