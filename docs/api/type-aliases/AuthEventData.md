[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthEventData

# Type Alias: AuthEventData

> **AuthEventData** = `object`

Auth event data

## Properties

### type

> **type**: [`AuthEventType`](AuthEventType.md)

---

### timestamp

> **timestamp**: `Date`

---

### provider?

> `optional` **provider?**: [`AuthProviderType`](AuthProviderType.md)

---

### user?

> `optional` **user?**: [`AuthUser`](AuthUser.md)

---

### session?

> `optional` **session?**: [`AuthSession`](AuthSession.md)

---

### error?

> `optional` **error?**: [`AuthErrorInfo`](AuthErrorInfo.md)

---

### context?

> `optional` **context?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>
