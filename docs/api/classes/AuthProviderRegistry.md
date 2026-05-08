[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthProviderRegistry

# Class: AuthProviderRegistry

Defined in: [auth/AuthProviderRegistry.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/AuthProviderRegistry.ts#L44)

AuthProviderRegistry - registers all auth providers with the factory

Call `AuthProviderRegistry.registerAllProviders()` once during
application startup. The method is idempotent and concurrency-safe.

## Constructors

### Constructor

> **new AuthProviderRegistry**(): `AuthProviderRegistry`

#### Returns

`AuthProviderRegistry`

## Methods

### registerAllProviders()

> `static` **registerAllProviders**(): `Promise`\<`void`\>

Defined in: [auth/AuthProviderRegistry.ts:51](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/AuthProviderRegistry.ts#L51)

Register all auth providers with the factory

#### Returns

`Promise`\<`void`\>

---

### isRegistered()

> `static` **isRegistered**(): `boolean`

Defined in: [auth/AuthProviderRegistry.ts:274](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/AuthProviderRegistry.ts#L274)

Check if providers are registered

#### Returns

`boolean`

---

### clearRegistrations()

> `static` **clearRegistrations**(): `void`

Defined in: [auth/AuthProviderRegistry.ts:281](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/AuthProviderRegistry.ts#L281)

Clear registrations (for testing)

#### Returns

`void`
