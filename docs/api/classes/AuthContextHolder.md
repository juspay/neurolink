[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthContextHolder

# Class: AuthContextHolder

Context holder for non-async-local-storage environments

Use this when async local storage is not available.

## Constructors

### Constructor

> **new AuthContextHolder**(): `AuthContextHolder`

#### Returns

`AuthContextHolder`

## Methods

### set()

> **set**(`context`): `void`

Set the auth context

#### Parameters

##### context

[`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md)

#### Returns

`void`

---

### get()

> **get**(): [`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md) \| `undefined`

Get the auth context

#### Returns

[`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md) \| `undefined`

---

### clear()

> **clear**(): `void`

Clear the auth context

#### Returns

`void`

---

### getUser()

> **getUser**(): [`AuthUser`](../type-aliases/AuthUser.md) \| `undefined`

Get the current user

#### Returns

[`AuthUser`](../type-aliases/AuthUser.md) \| `undefined`

---

### getSession()

> **getSession**(): [`AuthSession`](../type-aliases/AuthSession.md) \| `undefined`

Get the current session

#### Returns

[`AuthSession`](../type-aliases/AuthSession.md) \| `undefined`

---

### isAuthenticated()

> **isAuthenticated**(): `boolean`

Check if authenticated

#### Returns

`boolean`

---

### hasPermission()

> **hasPermission**(`permission`): `boolean`

Check if user has permission

#### Parameters

##### permission

`string`

#### Returns

`boolean`

---

### hasRole()

> **hasRole**(`role`): `boolean`

Check if user has role

#### Parameters

##### role

`string`

#### Returns

`boolean`
