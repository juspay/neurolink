[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthRateLimitConfig

# Type Alias: AuthRateLimitConfig

> **AuthRateLimitConfig** = `object`

Defined in: [types/auth.ts:1350](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L1350)

Rate limit configuration per user or role.

## Properties

### maxRequests

> **maxRequests**: `number`

Defined in: [types/auth.ts:1351](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L1351)

---

### windowMs

> **windowMs**: `number`

Defined in: [types/auth.ts:1352](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L1352)

---

### roleLimits?

> `optional` **roleLimits?**: `Record`\<`string`, `number`\>

Defined in: [types/auth.ts:1353](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L1353)

---

### userLimits?

> `optional` **userLimits?**: `Record`\<`string`, `number`\>

Defined in: [types/auth.ts:1354](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L1354)

---

### skipRoles?

> `optional` **skipRoles?**: `string`[]

Defined in: [types/auth.ts:1355](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L1355)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/auth.ts:1356](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L1356)
