[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthProviderRegistry

# Class: AuthProviderRegistry

Defined in: [auth/AuthProviderRegistry.ts:44](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/auth/AuthProviderRegistry.ts#L44)

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

Defined in: [auth/AuthProviderRegistry.ts:51](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/auth/AuthProviderRegistry.ts#L51)

Register all auth providers with the factory

#### Returns

`Promise`\<`void`\>

---

### isRegistered()

> `static` **isRegistered**(): `boolean`

Defined in: [auth/AuthProviderRegistry.ts:274](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/auth/AuthProviderRegistry.ts#L274)

Check if providers are registered

#### Returns

`boolean`

---

### clearRegistrations()

> `static` **clearRegistrations**(): `void`

Defined in: [auth/AuthProviderRegistry.ts:281](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/auth/AuthProviderRegistry.ts#L281)

Clear registrations (for testing)

#### Returns

`void`
