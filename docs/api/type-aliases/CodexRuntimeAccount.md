[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexRuntimeAccount

# Type Alias: CodexRuntimeAccount

> **CodexRuntimeAccount** = `object`

Defined in: [types/codex.ts:120](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L120)

A Codex account with its runtime cooldown/quota state hydrated from disk.

## Properties

### key

> **key**: `string`

Defined in: [types/codex.ts:121](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L121)

---

### label

> **label**: `string`

Defined in: [types/codex.ts:122](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L122)

---

### token

> **token**: `string`

Defined in: [types/codex.ts:123](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L123)

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/codex.ts:124](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L124)

---

### expiresAt?

> `optional` **expiresAt?**: `number`

Defined in: [types/codex.ts:125](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L125)

---

### accountId?

> `optional` **accountId?**: `string`

Defined in: [types/codex.ts:126](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L126)

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/codex.ts:127](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L127)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/codex.ts:128](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L128)

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/codex.ts:129](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L129)

---

### expiredCooldownUntil?

> `optional` **expiredCooldownUntil?**: `number`

Defined in: [types/codex.ts:133](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L133)

A persisted cooldown whose window has already passed. Present only when the
account is therefore eligible again, so the success path can delete the
spent record — nothing else ever reaps it.
