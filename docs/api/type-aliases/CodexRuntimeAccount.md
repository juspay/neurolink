[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexRuntimeAccount

# Type Alias: CodexRuntimeAccount

> **CodexRuntimeAccount** = `object`

Defined in: [types/codex.ts:87](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/codex.ts#L87)

A Codex account with its runtime cooldown/quota state hydrated from disk.

## Properties

### key

> **key**: `string`

Defined in: [types/codex.ts:88](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/codex.ts#L88)

---

### label

> **label**: `string`

Defined in: [types/codex.ts:89](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/codex.ts#L89)

---

### token

> **token**: `string`

Defined in: [types/codex.ts:90](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/codex.ts#L90)

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/codex.ts:91](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/codex.ts#L91)

---

### expiresAt?

> `optional` **expiresAt?**: `number`

Defined in: [types/codex.ts:92](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/codex.ts#L92)

---

### accountId?

> `optional` **accountId?**: `string`

Defined in: [types/codex.ts:93](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/codex.ts#L93)

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/codex.ts:94](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/codex.ts#L94)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/codex.ts:95](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/codex.ts#L95)

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/codex.ts:96](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/codex.ts#L96)

---

### expiredCooldownUntil?

> `optional` **expiredCooldownUntil?**: `number`

Defined in: [types/codex.ts:100](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/codex.ts#L100)

A persisted cooldown whose window has already passed. Present only when the
account is therefore eligible again, so the success path can delete the
spent record — nothing else ever reaps it.
