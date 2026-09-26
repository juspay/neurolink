[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthProviderRegistry

# Class: AuthProviderRegistry

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

Register all auth providers with the factory

#### Returns

`Promise`\<`void`\>

---

### isRegistered()

> `static` **isRegistered**(): `boolean`

Check if providers are registered

#### Returns

`boolean`

---

### clearRegistrations()

> `static` **clearRegistrations**(): `void`

Clear registrations (for testing)

#### Returns

`void`
