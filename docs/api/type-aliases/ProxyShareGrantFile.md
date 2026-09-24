[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrantFile

# Type Alias: ProxyShareGrantFile

> **ProxyShareGrantFile** = `object`

Defined in: [types/proxy.ts:4142](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4142)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4143)

---

### grants

> **grants**: `Record`\<`string`, [`ProxyShareGrant`](ProxyShareGrant.md)\>

Defined in: [types/proxy.ts:4144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4144)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/proxy.ts:4147](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4147)

This node's stable public address, when it has one. Recorded once so
every share link is minted against it without retyping.

---

### noteSecret?

> `optional` **noteSecret?**: `string`

Defined in: [types/proxy.ts:4149](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4149)

Node-level secret coin notes are signed with. Minted on first issue.
