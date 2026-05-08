[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuth2Error

# Class: OAuth2Error

Defined in: [client/auth.ts:432](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L432)

Error thrown during OAuth2 operations

## Extends

- `Error`

## Constructors

### Constructor

> **new OAuth2Error**(`message`, `status`, `responseBody`): `OAuth2Error`

Defined in: [client/auth.ts:436](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L436)

#### Parameters

##### message

`string`

##### status

`number`

##### responseBody

`string`

#### Returns

`OAuth2Error`

#### Overrides

`Error.constructor`

## Properties

### status

> `readonly` **status**: `number`

Defined in: [client/auth.ts:433](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L433)

---

### responseBody

> `readonly` **responseBody**: `string`

Defined in: [client/auth.ts:434](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L434)
