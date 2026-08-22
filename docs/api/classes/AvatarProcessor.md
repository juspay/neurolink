[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AvatarProcessor

# Class: AvatarProcessor

Defined in: [utils/avatarProcessor.ts:72](https://github.com/juspay/neurolink/blob/release/src/lib/utils/avatarProcessor.ts#L72)

Static processor managing the avatar handler registry.

## Constructors

### Constructor

> **new AvatarProcessor**(): `AvatarProcessor`

#### Returns

`AvatarProcessor`

## Methods

### registerHandler()

> `static` **registerHandler**(`providerName`, `handler`): `void`

Defined in: [utils/avatarProcessor.ts:80](https://github.com/juspay/neurolink/blob/release/src/lib/utils/avatarProcessor.ts#L80)

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

Defined in: [utils/avatarProcessor.ts:89](https://github.com/juspay/neurolink/blob/release/src/lib/utils/avatarProcessor.ts#L89)

Check if a provider has a registered avatar handler.

#### Parameters

##### providerName

`string`

#### Returns

`boolean`

---

### listProviders()

> `static` **listProviders**(): `string`[]

Defined in: [utils/avatarProcessor.ts:96](https://github.com/juspay/neurolink/blob/release/src/lib/utils/avatarProcessor.ts#L96)

List the names of all registered providers.

#### Returns

`string`[]

---

### getHandler()

> `static` **getHandler**(`providerName`): [`AvatarHandler`](../type-aliases/AvatarHandler.md) \| `undefined`

Defined in: [utils/avatarProcessor.ts:106](https://github.com/juspay/neurolink/blob/release/src/lib/utils/avatarProcessor.ts#L106)

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

Defined in: [utils/avatarProcessor.ts:113](https://github.com/juspay/neurolink/blob/release/src/lib/utils/avatarProcessor.ts#L113)

Clear all registered handlers (for testing).

#### Returns

`void`

---

### generate()

> `static` **generate**(`provider`, `options`): `Promise`\<[`AvatarResult`](../type-aliases/AvatarResult.md)\>

Defined in: [utils/avatarProcessor.ts:137](https://github.com/juspay/neurolink/blob/release/src/lib/utils/avatarProcessor.ts#L137)

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
