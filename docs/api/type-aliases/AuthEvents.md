[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthEvents

# Type Alias: AuthEvents

> **AuthEvents** = `object`

Defined in: [types/auth.ts:928](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L928)

Auth events for EventEmitter

## Properties

### auth:login

> **auth:login**: (`user`) => `void`

Defined in: [types/auth.ts:929](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L929)

#### Parameters

##### user

[`AuthUser`](AuthUser.md)

#### Returns

`void`

---

### auth:logout

> **auth:logout**: (`userId`) => `void`

Defined in: [types/auth.ts:930](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L930)

#### Parameters

##### userId

`string`

#### Returns

`void`

---

### auth:tokenRefresh

> **auth:tokenRefresh**: (`session`) => `void`

Defined in: [types/auth.ts:931](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L931)

#### Parameters

##### session

[`AuthSession`](AuthSession.md)

#### Returns

`void`

---

### auth:unauthorized

> **auth:unauthorized**: (`context`, `reason`) => `void`

Defined in: [types/auth.ts:932](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L932)

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

Defined in: [types/auth.ts:933](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L933)

#### Parameters

##### error

`Error`

##### context?

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`void`
