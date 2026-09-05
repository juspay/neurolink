[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrantFile

# Type Alias: ProxyShareGrantFile

> **ProxyShareGrantFile** = `object`

Defined in: [types/proxy.ts:3543](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3543)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3544](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3544)

---

### grants

> **grants**: `Record`\<`string`, [`ProxyShareGrant`](ProxyShareGrant.md)\>

Defined in: [types/proxy.ts:3545](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3545)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/proxy.ts:3548](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3548)

This node's stable public address, when it has one. Recorded once so
every share link is minted against it without retyping.

---

### noteSecret?

> `optional` **noteSecret?**: `string`

Defined in: [types/proxy.ts:3550](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3550)

Node-level secret coin notes are signed with. Minted on first issue.
