[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MusicProcessor

# Class: MusicProcessor

Static processor managing the music handler registry.

## Constructors

### Constructor

> **new MusicProcessor**(): `MusicProcessor`

#### Returns

`MusicProcessor`

## Methods

### registerHandler()

> `static` **registerHandler**(`providerName`, `handler`): `void`

Register a music handler for a specific provider.

#### Parameters

##### providerName

`string`

##### handler

[`MusicHandler`](../type-aliases/MusicHandler.md)

#### Returns

`void`

---

### supports()

> `static` **supports**(`providerName`): `boolean`

Check if a provider has a registered music handler.

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

> `static` **getHandler**(`providerName`): [`MusicHandler`](../type-aliases/MusicHandler.md) \| `undefined`

Get a registered music handler by provider name.

Exposed publicly so module-level auto-registration code can reuse an
already-registered primary handler when backfilling its aliases.

#### Parameters

##### providerName

`string`

#### Returns

[`MusicHandler`](../type-aliases/MusicHandler.md) \| `undefined`

---

### clearHandlers()

> `static` **clearHandlers**(): `void`

Clear all registered handlers (for testing).

#### Returns

`void`

---

### generate()

> `static` **generate**(`provider`, `options`): `Promise`\<[`MusicResult`](../type-aliases/MusicResult.md)\>

Generate a music track via the registered handler.

#### Parameters

##### provider

`string`

##### options

[`MusicOptions`](../type-aliases/MusicOptions.md)

#### Returns

`Promise`\<[`MusicResult`](../type-aliases/MusicResult.md)\>

#### Throws

MusicError on registry miss, handler-not-configured, or
generation failure.
