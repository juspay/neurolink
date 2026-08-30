[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexRuntimeAccount

# Type Alias: CodexRuntimeAccount

> **CodexRuntimeAccount** = `object`

Defined in: [types/codex.ts:91](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L91)

A Codex account with its runtime cooldown/quota state hydrated from disk.

## Properties

### key

> **key**: `string`

Defined in: [types/codex.ts:92](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L92)

---

### label

> **label**: `string`

Defined in: [types/codex.ts:93](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L93)

---

### token

> **token**: `string`

Defined in: [types/codex.ts:94](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L94)

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/codex.ts:95](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L95)

---

### expiresAt?

> `optional` **expiresAt?**: `number`

Defined in: [types/codex.ts:96](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L96)

---

### accountId?

> `optional` **accountId?**: `string`

Defined in: [types/codex.ts:97](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L97)

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/codex.ts:98](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L98)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/codex.ts:99](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L99)

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/codex.ts:100](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L100)

---

### expiredCooldownUntil?

> `optional` **expiredCooldownUntil?**: `number`

Defined in: [types/codex.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L104)

A persisted cooldown whose window has already passed. Present only when the
account is therefore eligible again, so the success path can delete the
spent record — nothing else ever reaps it.
