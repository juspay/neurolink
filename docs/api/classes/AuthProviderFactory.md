[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthProviderFactory

# Class: AuthProviderFactory

Defined in: [auth/AuthProviderFactory.ts:40](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/AuthProviderFactory.ts#L40)

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

Defined in: [auth/AuthProviderFactory.ts:50](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/AuthProviderFactory.ts#L50)

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

Defined in: [auth/AuthProviderFactory.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/AuthProviderFactory.ts#L68)

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

Defined in: [auth/AuthProviderFactory.ts:96](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/AuthProviderFactory.ts#L96)

Check if a provider is registered

#### Parameters

##### typeOrAlias

`string`

#### Returns

`boolean`

---

### getAvailableProviders()

> `static` **getAvailableProviders**(): `string`[]

Defined in: [auth/AuthProviderFactory.ts:106](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/AuthProviderFactory.ts#L106)

Get list of available provider types (excludes aliases)

#### Returns

`string`[]

---

### getProviderMetadata()

> `static` **getProviderMetadata**(`typeOrAlias`): [`AuthProviderMetadata`](../type-aliases/AuthProviderMetadata.md) \| `undefined`

Defined in: [auth/AuthProviderFactory.ts:113](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/AuthProviderFactory.ts#L113)

Get provider metadata

#### Parameters

##### typeOrAlias

`string`

#### Returns

[`AuthProviderMetadata`](../type-aliases/AuthProviderMetadata.md) \| `undefined`

---

### getAllProviderInfo()

> `static` **getAllProviderInfo**(): `object`[]

Defined in: [auth/AuthProviderFactory.ts:123](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/AuthProviderFactory.ts#L123)

Get all registered providers with their metadata

#### Returns

`object`[]

---

### clearRegistrations()

> `static` **clearRegistrations**(): `void`

Defined in: [auth/AuthProviderFactory.ts:140](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/AuthProviderFactory.ts#L140)

Clear all registrations (for testing)

#### Returns

`void`
