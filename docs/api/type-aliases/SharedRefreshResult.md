[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SharedRefreshResult

# Type Alias: SharedRefreshResult

> **SharedRefreshResult** = `object`

Defined in: [types/proxy.ts:1178](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1178)

Result shared by callers waiting on the same rotating refresh token.

## Properties

### result

> **result**: [`RefreshResult`](RefreshResult.md)

Defined in: [types/proxy.ts:1179](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1179)

---

### token

> **token**: `string`

Defined in: [types/proxy.ts:1180](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1180)

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/proxy.ts:1181](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1181)

---

### expiresAt?

> `optional` **expiresAt?**: `number`

Defined in: [types/proxy.ts:1182](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1182)
