[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageGenService

# Class: ImageGenService

Defined in: [image-gen/ImageGenService.ts:72](https://github.com/juspay/neurolink/blob/release/src/lib/image-gen/ImageGenService.ts#L72)

Image generation service for AI-powered image creation

Uses NeuroLink SDK to generate images with support for:

- Multiple providers (Vertex AI, OpenAI, etc.)
- Reference images for style guidance
- PDF documents for contextual generation
- Configurable aspect ratios and styles

## Examples

```typescript
const service = new ImageGenService();
const result = await service.generate({
  prompt: "A cute robot playing chess",
});
```

```typescript
const service = new ImageGenService({
  defaultProvider: "openai",
  defaultModel: "dall-e-3",
  timeout: 60000,
});
```

## Constructors

### Constructor

> **new ImageGenService**(`config?`): `ImageGenService`

Defined in: [image-gen/ImageGenService.ts:82](https://github.com/juspay/neurolink/blob/release/src/lib/image-gen/ImageGenService.ts#L82)

Create a new ImageGenService instance

#### Parameters

##### config?

`Partial`\<[`ImageGenConfig`](../type-aliases/ImageGenConfig.md)\>

Optional configuration overrides

#### Returns

`ImageGenService`

## Methods

### generate()

> **generate**(`options`): `Promise`\<[`ImageGenResult`](../type-aliases/ImageGenResult.md)\>

Defined in: [image-gen/ImageGenService.ts:131](https://github.com/juspay/neurolink/blob/release/src/lib/image-gen/ImageGenService.ts#L131)

Generate an image from a text prompt

#### Parameters

##### options

[`ImageGenOptions`](../type-aliases/ImageGenOptions.md)

Generation options including prompt, style, etc.

#### Returns

`Promise`\<[`ImageGenResult`](../type-aliases/ImageGenResult.md)\>

Promise resolving to generation result

#### Examples

```typescript
const result = await service.generate({
  prompt: "A futuristic cityscape",
});
```

```typescript
const referenceImage = fs.readFileSync("style-reference.jpg");
const result = await service.generate({
  prompt: "A portrait in this style",
  images: [referenceImage],
  aspectRatio: "1:1",
});
```

---

### isEnabled()

> **isEnabled**(): `boolean`

Defined in: [image-gen/ImageGenService.ts:350](https://github.com/juspay/neurolink/blob/release/src/lib/image-gen/ImageGenService.ts#L350)

Check if image generation is enabled

#### Returns

`boolean`

---

### getModel()

> **getModel**(): `string`

Defined in: [image-gen/ImageGenService.ts:357](https://github.com/juspay/neurolink/blob/release/src/lib/image-gen/ImageGenService.ts#L357)

Get the default model

#### Returns

`string`

---

### getProvider()

> **getProvider**(): `string`

Defined in: [image-gen/ImageGenService.ts:364](https://github.com/juspay/neurolink/blob/release/src/lib/image-gen/ImageGenService.ts#L364)

Get the default provider

#### Returns

`string`

---

### getConfig()

> **getConfig**(): `Readonly`\<[`ImageGenConfig`](../type-aliases/ImageGenConfig.md)\>

Defined in: [image-gen/ImageGenService.ts:371](https://github.com/juspay/neurolink/blob/release/src/lib/image-gen/ImageGenService.ts#L371)

Get the service configuration

#### Returns

`Readonly`\<[`ImageGenConfig`](../type-aliases/ImageGenConfig.md)\>

---

### getInstanceId()

> **getInstanceId**(): `string`

Defined in: [image-gen/ImageGenService.ts:378](https://github.com/juspay/neurolink/blob/release/src/lib/image-gen/ImageGenService.ts#L378)

Get the service instance ID (for debugging)

#### Returns

`string`

---

### updateConfig()

> **updateConfig**(`config`): `void`

Defined in: [image-gen/ImageGenService.ts:387](https://github.com/juspay/neurolink/blob/release/src/lib/image-gen/ImageGenService.ts#L387)

Update service configuration

#### Parameters

##### config

`Partial`\<[`ImageGenConfig`](../type-aliases/ImageGenConfig.md)\>

Partial configuration to merge

#### Returns

`void`

---

### enable()

> **enable**(): `void`

Defined in: [image-gen/ImageGenService.ts:397](https://github.com/juspay/neurolink/blob/release/src/lib/image-gen/ImageGenService.ts#L397)

Enable image generation

#### Returns

`void`

---

### disable()

> **disable**(): `void`

Defined in: [image-gen/ImageGenService.ts:404](https://github.com/juspay/neurolink/blob/release/src/lib/image-gen/ImageGenService.ts#L404)

Disable image generation

#### Returns

`void`
