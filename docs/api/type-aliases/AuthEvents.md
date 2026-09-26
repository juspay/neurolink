[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthEvents

# Type Alias: AuthEvents

> **AuthEvents** = `object`

Auth events for EventEmitter

## Properties

### auth:login

> **auth:login**: (`user`) => `void`

#### Parameters

##### user

[`AuthUser`](AuthUser.md)

#### Returns

`void`

---

### auth:logout

> **auth:logout**: (`userId`) => `void`

#### Parameters

##### userId

`string`

#### Returns

`void`

---

### auth:tokenRefresh

> **auth:tokenRefresh**: (`session`) => `void`

#### Parameters

##### session

[`AuthSession`](AuthSession.md)

#### Returns

`void`

---

### auth:unauthorized

> **auth:unauthorized**: (`context`, `reason`) => `void`

#### Parameters

##### context

[`AuthRequestContext`](AuthRequestContext.md)

##### reason

`string`

#### Returns

`void`

---

### auth:error

> **auth:error**: (`error`, `context?`) => `void`

#### Parameters

##### error

`Error`

##### context?

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`void`
