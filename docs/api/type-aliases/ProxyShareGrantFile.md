[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrantFile

# Type Alias: ProxyShareGrantFile

> **ProxyShareGrantFile** = `object`

## Properties

### schemaVersion

> **schemaVersion**: `1`

---

### grants

> **grants**: `Record`\<`string`, [`ProxyShareGrant`](ProxyShareGrant.md)\>

---

### publicUrl?

> `optional` **publicUrl?**: `string`

This node's stable public address, when it has one. Recorded once so
every share link is minted against it without retyping.

---

### noteSecret?

> `optional` **noteSecret?**: `string`

Node-level secret coin notes are signed with. Minted on first issue.
