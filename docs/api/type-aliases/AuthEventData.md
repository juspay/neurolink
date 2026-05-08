[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthEventData

# Type Alias: AuthEventData

> **AuthEventData** = `object`

Defined in: [types/auth.ts:955](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L955)

Auth event data

## Properties

### type

> **type**: [`AuthEventType`](AuthEventType.md)

Defined in: [types/auth.ts:956](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L956)

---

### timestamp

> **timestamp**: `Date`

Defined in: [types/auth.ts:957](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L957)

---

### provider?

> `optional` **provider?**: [`AuthProviderType`](AuthProviderType.md)

Defined in: [types/auth.ts:958](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L958)

---

### user?

> `optional` **user?**: [`AuthUser`](AuthUser.md)

Defined in: [types/auth.ts:959](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L959)

---

### session?

> `optional` **session?**: [`AuthSession`](AuthSession.md)

Defined in: [types/auth.ts:960](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L960)

---

### error?

> `optional` **error?**: [`AuthErrorInfo`](AuthErrorInfo.md)

Defined in: [types/auth.ts:961](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L961)

---

### context?

> `optional` **context?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/auth.ts:962](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L962)
