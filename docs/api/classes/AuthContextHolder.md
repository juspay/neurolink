[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthContextHolder

# Class: AuthContextHolder

Defined in: [auth/authContext.ts:286](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/authContext.ts#L286)

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

Defined in: [auth/authContext.ts:292](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/authContext.ts#L292)

Set the auth context

#### Parameters

##### context

[`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md)

#### Returns

`void`

---

### get()

> **get**(): [`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md) \| `undefined`

Defined in: [auth/authContext.ts:299](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/authContext.ts#L299)

Get the auth context

#### Returns

[`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md) \| `undefined`

---

### clear()

> **clear**(): `void`

Defined in: [auth/authContext.ts:306](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/authContext.ts#L306)

Clear the auth context

#### Returns

`void`

---

### getUser()

> **getUser**(): [`AuthUser`](../type-aliases/AuthUser.md) \| `undefined`

Defined in: [auth/authContext.ts:313](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/authContext.ts#L313)

Get the current user

#### Returns

[`AuthUser`](../type-aliases/AuthUser.md) \| `undefined`

---

### getSession()

> **getSession**(): [`AuthSession`](../type-aliases/AuthSession.md) \| `undefined`

Defined in: [auth/authContext.ts:320](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/authContext.ts#L320)

Get the current session

#### Returns

[`AuthSession`](../type-aliases/AuthSession.md) \| `undefined`

---

### isAuthenticated()

> **isAuthenticated**(): `boolean`

Defined in: [auth/authContext.ts:327](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/authContext.ts#L327)

Check if authenticated

#### Returns

`boolean`

---

### hasPermission()

> **hasPermission**(`permission`): `boolean`

Defined in: [auth/authContext.ts:334](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/authContext.ts#L334)

Check if user has permission

#### Parameters

##### permission

`string`

#### Returns

`boolean`

---

### hasRole()

> **hasRole**(`role`): `boolean`

Defined in: [auth/authContext.ts:362](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/authContext.ts#L362)

Check if user has role

#### Parameters

##### role

`string`

#### Returns

`boolean`
