[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthProviderFactory

# Class: AuthProviderFactory

AuthProviderFactory - Creates authentication provider instances

Pure static factory with no hardcoded imports. All providers are
registered dynamically by AuthProviderRegistry to avoid circular
dependencies and enable lazy loading.

## Example

```typescript
// Create a provider (after AuthProviderRegistry.registerAllProviders())
const provider = await AuthProviderFactory.createProvider("auth0", {
  type: "auth0",
  domain: "your-tenant.auth0.com",
  clientId: "your-client-id",
});
```

## Constructors

### Constructor

> **new AuthProviderFactory**(): `AuthProviderFactory`

#### Returns

`AuthProviderFactory`

## Methods

### registerProvider()

> `static` **registerProvider**(`type`, `factory`, `aliases?`, `metadata?`): `void`

Register a provider with the factory

#### Parameters

##### type

`string`

##### factory

[`AuthProviderConstructor`](../type-aliases/AuthProviderConstructor.md)

##### aliases?

`string`[] = `[]`

##### metadata?

[`AuthProviderMetadata`](../type-aliases/AuthProviderMetadata.md)

#### Returns

`void`

---

### createProvider()

> `static` **createProvider**(`typeOrAlias`, `config`): `Promise`\<[`AuthProvider`](../type-aliases/AuthProvider.md)\>

Create a provider instance

#### Parameters

##### typeOrAlias

`string`

##### config

[`AuthProviderConfig`](../type-aliases/AuthProviderConfig.md)

#### Returns

`Promise`\<[`AuthProvider`](../type-aliases/AuthProvider.md)\>

---

### hasProvider()

> `static` **hasProvider**(`typeOrAlias`): `boolean`

Check if a provider is registered

#### Parameters

##### typeOrAlias

`string`

#### Returns

`boolean`

---

### getAvailableProviders()

> `static` **getAvailableProviders**(): `string`[]

Get list of available provider types (excludes aliases)

#### Returns

`string`[]

---

### getProviderMetadata()

> `static` **getProviderMetadata**(`typeOrAlias`): [`AuthProviderMetadata`](../type-aliases/AuthProviderMetadata.md) \| `undefined`

Get provider metadata

#### Parameters

##### typeOrAlias

`string`

#### Returns

[`AuthProviderMetadata`](../type-aliases/AuthProviderMetadata.md) \| `undefined`

---

### getAllProviderInfo()

> `static` **getAllProviderInfo**(): `object`[]

Get all registered providers with their metadata

#### Returns

`object`[]

---

### clearRegistrations()

> `static` **clearRegistrations**(): `void`

Clear all registrations (for testing)

#### Returns

`void`
