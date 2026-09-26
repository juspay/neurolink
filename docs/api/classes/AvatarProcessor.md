[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AvatarProcessor

# Class: AvatarProcessor

Static processor managing the avatar handler registry.

## Constructors

### Constructor

> **new AvatarProcessor**(): `AvatarProcessor`

#### Returns

`AvatarProcessor`

## Methods

### registerHandler()

> `static` **registerHandler**(`providerName`, `handler`): `void`

Register an avatar handler for a specific provider.

#### Parameters

##### providerName

`string`

##### handler

[`AvatarHandler`](../type-aliases/AvatarHandler.md)

#### Returns

`void`

---

### supports()

> `static` **supports**(`providerName`): `boolean`

Check if a provider has a registered avatar handler.

#### Parameters

##### providerName

`string`

#### Returns

`boolean`

---

### listProviders()

> `static` **listProviders**(): `string`[]

List the names of all registered providers.

#### Returns

`string`[]

---

### getHandler()

> `static` **getHandler**(`providerName`): [`AvatarHandler`](../type-aliases/AvatarHandler.md) \| `undefined`

Get a registered avatar handler by provider name.

Exposed publicly so module-level auto-registration code can reuse an
already-registered primary handler when backfilling its aliases.

#### Parameters

##### providerName

`string`

#### Returns

[`AvatarHandler`](../type-aliases/AvatarHandler.md) \| `undefined`

---

### clearHandlers()

> `static` **clearHandlers**(): `void`

Clear all registered handlers (for testing).

#### Returns

`void`

---

### generate()

> `static` **generate**(`provider`, `options`): `Promise`\<[`AvatarResult`](../type-aliases/AvatarResult.md)\>

Generate an avatar video via the registered handler.

#### Parameters

##### provider

`string`

##### options

[`AvatarOptions`](../type-aliases/AvatarOptions.md)

#### Returns

`Promise`\<[`AvatarResult`](../type-aliases/AvatarResult.md)\>

#### Throws

AvatarError on registry miss, handler-not-configured, or
generation failure.
