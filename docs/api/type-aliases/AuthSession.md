[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthSession

# Type Alias: AuthSession

> **AuthSession** = `object`

Session information

## Properties

### id

> **id**: `string`

Session identifier

---

### user

> **user**: [`AuthUser`](AuthUser.md)

Associated user

---

### accessToken?

> `optional` **accessToken?**: `string`

Session access token

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Session refresh token

---

### createdAt

> **createdAt**: `Date`

Session creation time

---

### expiresAt

> **expiresAt**: `Date`

Session expiration time

---

### isValid

> **isValid**: `boolean`

Whether session is still valid

---

### lastActivityAt?

> `optional` **lastActivityAt?**: `Date`

Last activity timestamp

---

### ipAddress?

> `optional` **ipAddress?**: `string`

IP address of session origin

---

### userAgent?

> `optional` **userAgent?**: `string`

User agent string

---

### deviceId?

> `optional` **deviceId?**: `string`

Device fingerprint

---

### metadata?

> `optional` **metadata?**: [`UnknownRecord`](UnknownRecord.md)

Session metadata
