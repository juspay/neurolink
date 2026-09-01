[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexRuntimeAccount

# Type Alias: CodexRuntimeAccount

> **CodexRuntimeAccount** = `object`

Defined in: [types/codex.ts:109](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L109)

A Codex account with its runtime cooldown/quota state hydrated from disk.

## Properties

### key

> **key**: `string`

Defined in: [types/codex.ts:110](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L110)

---

### label

> **label**: `string`

Defined in: [types/codex.ts:111](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L111)

---

### token

> **token**: `string`

Defined in: [types/codex.ts:112](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L112)

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/codex.ts:113](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L113)

---

### expiresAt?

> `optional` **expiresAt?**: `number`

Defined in: [types/codex.ts:114](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L114)

---

### accountId?

> `optional` **accountId?**: `string`

Defined in: [types/codex.ts:115](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L115)

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/codex.ts:116](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L116)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/codex.ts:117](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L117)

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/codex.ts:118](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L118)

---

### expiredCooldownUntil?

> `optional` **expiredCooldownUntil?**: `number`

Defined in: [types/codex.ts:122](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L122)

A persisted cooldown whose window has already passed. Present only when the
account is therefore eligible again, so the success path can delete the
spent record — nothing else ever reaps it.
