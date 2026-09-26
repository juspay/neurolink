[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexRuntimeAccount

# Type Alias: CodexRuntimeAccount

> **CodexRuntimeAccount** = `object`

A Codex account with its runtime cooldown/quota state hydrated from disk.

## Properties

### key

> **key**: `string`

---

### label

> **label**: `string`

---

### token

> **token**: `string`

---

### refreshToken?

> `optional` **refreshToken?**: `string`

---

### expiresAt?

> `optional` **expiresAt?**: `number`

---

### accountId?

> `optional` **accountId?**: `string`

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

---

### expiredCooldownUntil?

> `optional` **expiredCooldownUntil?**: `number`

A persisted cooldown whose window has already passed. Present only when the
account is therefore eligible again, so the success path can delete the
spent record — nothing else ever reaps it.
