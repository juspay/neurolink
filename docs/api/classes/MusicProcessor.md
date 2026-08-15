[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MusicProcessor

# Class: MusicProcessor

Defined in: [utils/musicProcessor.ts:71](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/musicProcessor.ts#L71)

Static processor managing the music handler registry.

## Constructors

### Constructor

> **new MusicProcessor**(): `MusicProcessor`

#### Returns

`MusicProcessor`

## Methods

### registerHandler()

> `static` **registerHandler**(`providerName`, `handler`): `void`

Defined in: [utils/musicProcessor.ts:79](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/musicProcessor.ts#L79)

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

Defined in: [utils/musicProcessor.ts:88](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/musicProcessor.ts#L88)

Check if a provider has a registered music handler.

#### Parameters

##### providerName

`string`

#### Returns

`boolean`

---

### listProviders()

> `static` **listProviders**(): `string`[]

Defined in: [utils/musicProcessor.ts:95](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/musicProcessor.ts#L95)

List the names of all registered providers.

#### Returns

`string`[]

---

### getHandler()

> `static` **getHandler**(`providerName`): [`MusicHandler`](../type-aliases/MusicHandler.md) \| `undefined`

Defined in: [utils/musicProcessor.ts:105](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/musicProcessor.ts#L105)

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

Defined in: [utils/musicProcessor.ts:112](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/musicProcessor.ts#L112)

Clear all registered handlers (for testing).

#### Returns

`void`

---

### generate()

> `static` **generate**(`provider`, `options`): `Promise`\<[`MusicResult`](../type-aliases/MusicResult.md)\>

Defined in: [utils/musicProcessor.ts:136](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/musicProcessor.ts#L136)

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
