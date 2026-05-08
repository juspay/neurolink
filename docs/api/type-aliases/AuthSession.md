[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthSession

# Type Alias: AuthSession

> **AuthSession** = `object`

Defined in: [types/auth.ts:151](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L151)

Session information

## Properties

### id

> **id**: `string`

Defined in: [types/auth.ts:153](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L153)

Session identifier

---

### user

> **user**: [`AuthUser`](AuthUser.md)

Defined in: [types/auth.ts:155](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L155)

Associated user

---

### accessToken?

> `optional` **accessToken?**: `string`

Defined in: [types/auth.ts:157](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L157)

Session access token

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/auth.ts:159](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L159)

Session refresh token

---

### createdAt

> **createdAt**: `Date`

Defined in: [types/auth.ts:161](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L161)

Session creation time

---

### expiresAt

> **expiresAt**: `Date`

Defined in: [types/auth.ts:163](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L163)

Session expiration time

---

### isValid

> **isValid**: `boolean`

Defined in: [types/auth.ts:165](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L165)

Whether session is still valid

---

### lastActivityAt?

> `optional` **lastActivityAt?**: `Date`

Defined in: [types/auth.ts:167](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L167)

Last activity timestamp

---

### ipAddress?

> `optional` **ipAddress?**: `string`

Defined in: [types/auth.ts:169](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L169)

IP address of session origin

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/auth.ts:171](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L171)

User agent string

---

### deviceId?

> `optional` **deviceId?**: `string`

Defined in: [types/auth.ts:173](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L173)

Device fingerprint

---

### metadata?

> `optional` **metadata?**: [`UnknownRecord`](UnknownRecord.md)

Defined in: [types/auth.ts:175](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L175)

Session metadata
